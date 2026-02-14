import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { encrypt } from '../services/encryptionService';
import { evaluateWithGemini } from '../services/geminiService';
import { generateChatResponse } from '../services/voiceChatService';
import { calculateCategoryAverage, calculateWeightedTotal, calculateGap } from '../utils/scoreCalculator';
import { parseJsonFields } from '../utils/jsonParser';

const router = Router();
router.use(authenticate);

// GET /api/assessments/my - Nurse's own assessments
router.get('/my', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.assessmentSession.findMany({
      where: { nurseId: req.user!.id },
      include: {
        case: true,
        aiScore: true,
        reviewerScore: true,
        selfScores: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const parsed = sessions.map(s => ({
      ...s,
      aiScore: parseJsonFields(s.aiScore, ['criteriaScores', 'categoryScores']),
      reviewerScore: parseJsonFields(s.reviewerScore, ['criteriaScores']),
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Get my assessments error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/assessments - All assessments (admin/reviewer)
router.get('/', requireRole('ADMIN', 'REVIEWER'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.assessmentSession.findMany({
      include: {
        nurse: { select: { id: true, name: true, nameTh: true, department: true, experienceLevel: true } },
        case: true,
        aiScore: true,
        reviewerScore: true
      },
      orderBy: { createdAt: 'desc' }
    });
    const parsed = sessions.map(s => ({
      ...s,
      aiScore: parseJsonFields(s.aiScore, ['criteriaScores', 'categoryScores']),
      reviewerScore: parseJsonFields(s.reviewerScore, ['criteriaScores']),
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Get all assessments error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/assessments/:id - Get assessment detail
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await prisma.assessmentSession.findUnique({
      where: { id: req.params.id },
      include: {
        nurse: { select: { id: true, name: true, nameTh: true, department: true, experienceLevel: true } },
        case: true,
        transcript: true,
        selfScores: { include: { criteria: { include: { group: true } } } },
        aiScore: true,
        reviewerScore: true,
        finalScores: { include: { criteria: { include: { group: true } } } },
        versionHistory: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Get standard levels for this nurse's experience level
    const standardLevels = await prisma.standardLevel.findMany({
      where: { experienceLevel: session.experienceLevel }
    });

    res.json({
      ...session,
      aiScore: parseJsonFields(session.aiScore, ['criteriaScores', 'categoryScores']),
      reviewerScore: parseJsonFields(session.reviewerScore, ['criteriaScores']),
      standardLevels
    });
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/assessments/start - Start new assessment
router.post('/start', requireRole('NURSE'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { caseId } = req.body;
    
    if (!caseId) {
      res.status(400).json({ error: 'กรุณาเลือกกรณีศึกษา' });
      return;
    }

    const nurse = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!nurse) {
      res.status(404).json({ error: 'ไม่พบผู้ใช้' });
      return;
    }

    const session = await prisma.assessmentSession.create({
      data: {
        nurseId: req.user!.id,
        caseId,
        experienceLevel: nurse.experienceLevel,
        status: 'IN_PROGRESS'
      },
      include: { case: true }
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Start assessment error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/assessments/:id/self-score - Submit self-assessment scores
router.post('/:id/self-score', requireRole('NURSE'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { scores } = req.body; // [{criteriaId, score}]

    const session = await prisma.assessmentSession.findUnique({ where: { id } });
    if (!session || session.nurseId !== req.user!.id) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Upsert self scores
    for (const s of scores) {
      await prisma.selfScore.upsert({
        where: { sessionId_criteriaId: { sessionId: id, criteriaId: s.criteriaId } },
        create: { sessionId: id, criteriaId: s.criteriaId, score: s.score },
        update: { score: s.score }
      });
    }

    await prisma.assessmentSession.update({
      where: { id },
      data: { status: 'SELF_ASSESSED' }
    });

    res.json({ message: 'บันทึกการประเมินตนเองเรียบร้อย' });
  } catch (error) {
    console.error('Self score error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/assessments/:id/submit - Submit response + trigger AI evaluation
router.post('/:id/submit', requireRole('NURSE'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { text, inputType } = req.body; // inputType: 'TEXT' | 'VOICE'

    const session = await prisma.assessmentSession.findUnique({
      where: { id },
      include: { case: true }
    });

    if (!session || session.nurseId !== req.user!.id) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'กรุณาตอบคำถาม' });
      return;
    }

    // Store transcript
    const encryptedText = encrypt(text);
    await prisma.transcript.upsert({
      where: { sessionId: id },
      create: {
        sessionId: id,
        inputType: inputType || 'TEXT',
        rawText: text,
        encryptedText
      },
      update: {
        rawText: text,
        encryptedText,
        inputType: inputType || 'TEXT'
      }
    });

    // Get AI-assessed criteria
    const aiGroups = await prisma.competencyGroup.findMany({
      where: { assessedByAI: true, active: true },
      include: {
        criteria: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const allCriteria = aiGroups.flatMap(g => 
      g.criteria.map(c => ({
        id: c.id,
        nameTh: c.nameTh,
        nameEn: c.nameEn,
        groupNameEn: g.nameEn,
        groupId: g.id
      }))
    );

    console.log(`[Assessment ${id}] Found ${allCriteria.length} AI-assessed criteria`);

    if (allCriteria.length === 0) {
      res.status(500).json({ error: 'ไม่พบเกณฑ์การประเมิน กรุณาติดต่อผู้ดูแลระบบ' });
      return;
    }

    const criteriaToGroupMap: Record<string, string> = {};
    allCriteria.forEach(c => { criteriaToGroupMap[c.id] = c.groupId; });

    // Parse reasoning indicators safely
    let reasoningIndicators: string[] = [];
    try {
      const rawIndicators = session.case.reasoningIndicators;
      if (typeof rawIndicators === 'string') {
        reasoningIndicators = JSON.parse(rawIndicators);
      } else if (Array.isArray(rawIndicators)) {
        reasoningIndicators = rawIndicators;
      }
    } catch (parseErr) {
      console.error('Failed to parse reasoning indicators:', parseErr);
      reasoningIndicators = [];
    }

    console.log(`[Assessment ${id}] Starting AI evaluation with ${reasoningIndicators.length} reasoning indicators`);

    try {
      // Call AI evaluation
      const { output, rawResponse, retryCount } = await evaluateWithGemini(
        allCriteria,
        {
          title: session.case.title,
          descriptionTh: session.case.descriptionTh,
          descriptionEn: session.case.descriptionEn,
          reasoningIndicators
        },
        text
      );

      console.log(`[Assessment ${id}] AI evaluation successful. Scored ${output.criteriaScores.length} criteria`);

      // Calculate category averages and weighted total
      const criteriaScoresTyped = output.criteriaScores as Array<{ criteriaId: string; score: number; reasoning?: string }>;
      const categoryScores = calculateCategoryAverage(criteriaScoresTyped, criteriaToGroupMap);
      const weightedTotal = calculateWeightedTotal(criteriaScoresTyped);

      // Store AI score
      await prisma.aIScore.create({
        data: {
          sessionId: id,
          criteriaScores: JSON.stringify(output.criteriaScores),
          categoryScores: JSON.stringify(categoryScores),
          weightedTotal,
          strengths: output.strengths,
          weaknesses: output.weaknesses,
          recommendations: output.recommendations,
          confidenceScore: output.confidenceScore,
          valid: true,
          retryCount,
          rawResponse
        }
      });

      // Calculate GAP and store final scores (AI as initial source)
      const standardLevels = await prisma.standardLevel.findMany({
        where: { experienceLevel: session.experienceLevel }
      });
      const standardMap: Record<string, number> = {};
      standardLevels.forEach(s => { standardMap[s.criteriaId] = s.standardScore; });

      for (const cs of output.criteriaScores) {
        const standard = standardMap[cs.criteriaId] || 1;
        const gap = calculateGap(cs.score, standard);
        await prisma.finalScore.upsert({
          where: { sessionId_criteriaId: { sessionId: id, criteriaId: cs.criteriaId } },
          create: { sessionId: id, criteriaId: cs.criteriaId, score: cs.score, gap, source: 'AI' },
          update: { score: cs.score, gap, source: 'AI' }
        });
      }

      // Update session status
      await prisma.assessmentSession.update({
        where: { id },
        data: { status: 'AI_SCORED' }
      });

      // Log version history
      await prisma.scoreVersionHistory.create({
        data: {
          sessionId: id,
          changedById: req.user!.id,
          changeType: 'AI_SCORE',
          newValues: JSON.stringify(output)
        }
      });

      console.log(`[Assessment ${id}] Successfully completed AI evaluation and stored results`);
      res.json({ message: 'ส่งคำตอบและประเมินโดย AI เสร็จสิ้น', status: 'AI_SCORED' });
    } catch (aiError: any) {
      console.error(`[Assessment ${id}] AI evaluation error:`, aiError.message || aiError);
      console.error('Error details:', aiError);
      
      // Mark as failed but don't crash
      await prisma.assessmentSession.update({
        where: { id },
        data: { status: 'AI_FAILED' }
      });

      await prisma.aIScore.create({
        data: {
          sessionId: id,
          criteriaScores: JSON.stringify([]),
          valid: false,
          retryCount: 2,
          rawResponse: aiError.message
        }
      });

      res.status(200).json({ 
        message: 'บันทึกคำตอบเรียบร้อย แต่ AI ไม่สามารถประเมินได้ กรุณาติดต่อผู้ดูแลระบบ',
        status: 'AI_FAILED',
        error: aiError.message
      });
    }
  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/assessments/:id/chat - Multi-turn voice conversation with AI Avatar
router.post('/:id/chat', requireRole('NURSE'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { history } = req.body; // Array of { role: 'ai' | 'nurse', text: string }

    const session = await prisma.assessmentSession.findUnique({
      where: { id },
      include: { case: true }
    });

    if (!session || session.nurseId !== req.user!.id) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Get AI-assessed criteria for conversation context
    const aiGroups = await prisma.competencyGroup.findMany({
      where: { assessedByAI: true, active: true },
      include: {
        criteria: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const allCriteria = aiGroups.flatMap(g =>
      g.criteria.map(c => ({
        id: c.id,
        nameTh: c.nameTh,
        nameEn: c.nameEn,
        groupNameEn: g.nameEn,
      }))
    );

    // Parse reasoning indicators
    let reasoningIndicators: string[] = [];
    try {
      const raw = session.case.reasoningIndicators;
      if (typeof raw === 'string') reasoningIndicators = JSON.parse(raw);
      else if (Array.isArray(raw)) reasoningIndicators = raw;
    } catch { reasoningIndicators = []; }

    const caseInfo = {
      title: session.case.title,
      descriptionTh: session.case.descriptionTh,
      descriptionEn: session.case.descriptionEn || session.case.title,
      reasoningIndicators
    };

    const experienceLevel = session.experienceLevel || 'LEVEL_1';

    const chatResponse = await generateChatResponse(
      caseInfo,
      allCriteria,
      history || [],
      experienceLevel
    );

    res.json(chatResponse);
  } catch (error: any) {
    console.error('Voice chat error:', error);
    res.status(500).json({ error: 'ระบบสนทนาขัดข้องชั่วคราว กรุณาลองอีกครั้ง' });
  }
});

// POST /api/assessments/:id/submit-conversation - Submit full conversation transcript for AI evaluation
router.post('/:id/submit-conversation', requireRole('NURSE'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { history } = req.body; // Full conversation history

    const session = await prisma.assessmentSession.findUnique({
      where: { id },
      include: { case: true }
    });

    if (!session || session.nurseId !== req.user!.id) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Build transcript from conversation
    const transcriptText = (history || [])
      .map((m: { role: string; text: string }) =>
        `${m.role === 'ai' ? 'AI Avatar' : 'พยาบาล'}: ${m.text}`
      )
      .join('\n\n');

    // Store transcript
    const encryptedText = encrypt(transcriptText);
    await prisma.transcript.upsert({
      where: { sessionId: id },
      create: {
        sessionId: id,
        inputType: 'VOICE',
        rawText: transcriptText,
        encryptedText
      },
      update: {
        rawText: transcriptText,
        encryptedText,
        inputType: 'VOICE'
      }
    });

    // Now trigger AI evaluation (reuse existing logic)
    const aiGroups = await prisma.competencyGroup.findMany({
      where: { assessedByAI: true, active: true },
      include: {
        criteria: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const allCriteria = aiGroups.flatMap(g =>
      g.criteria.map(c => ({
        id: c.id,
        nameTh: c.nameTh,
        nameEn: c.nameEn,
        groupNameEn: g.nameEn,
        groupId: g.id
      }))
    );

    if (allCriteria.length === 0) {
      res.status(500).json({ error: 'ไม่พบเกณฑ์การประเมิน' });
      return;
    }

    const criteriaToGroupMap: Record<string, string> = {};
    allCriteria.forEach(c => { criteriaToGroupMap[c.id] = c.groupId; });

    let reasoningIndicators: string[] = [];
    try {
      const raw = session.case.reasoningIndicators;
      if (typeof raw === 'string') reasoningIndicators = JSON.parse(raw);
      else if (Array.isArray(raw)) reasoningIndicators = raw;
    } catch { reasoningIndicators = []; }

    const caseInfo = {
      title: session.case.title,
      descriptionTh: session.case.descriptionTh,
      descriptionEn: session.case.descriptionEn || session.case.title,
      reasoningIndicators
    };

    try {
      const { output, rawResponse, retryCount } = await evaluateWithGemini(
        allCriteria,
        caseInfo,
        transcriptText
      );

      // Store AI scores (same logic as submit endpoint)
      const criteriaScoresTyped = output.criteriaScores as Array<{ criteriaId: string; score: number; reasoning?: string }>;
      const categoryScores = calculateCategoryAverage(criteriaScoresTyped, criteriaToGroupMap);
      const weightedTotal = calculateWeightedTotal(criteriaScoresTyped);

      await prisma.aIScore.upsert({
        where: { sessionId: id },
        create: {
          sessionId: id,
          criteriaScores: JSON.stringify(output.criteriaScores),
          categoryScores: JSON.stringify(categoryScores),
          weightedTotal,
          strengths: output.strengths,
          weaknesses: output.weaknesses,
          recommendations: output.recommendations,
          confidenceScore: output.confidenceScore,
          valid: true,
          retryCount,
          rawResponse
        },
        update: {
          criteriaScores: JSON.stringify(output.criteriaScores),
          categoryScores: JSON.stringify(categoryScores),
          weightedTotal,
          strengths: output.strengths,
          weaknesses: output.weaknesses,
          recommendations: output.recommendations,
          confidenceScore: output.confidenceScore,
          valid: true,
          retryCount,
          rawResponse
        }
      });

      // Create final scores
      const standardLevels = await prisma.standardLevel.findMany({
        where: { experienceLevel: session.experienceLevel }
      });
      const standardMap: Record<string, number> = {};
      standardLevels.forEach(sl => { standardMap[sl.criteriaId] = sl.standardScore; });

      for (const cs of output.criteriaScores) {
        const standard = standardMap[cs.criteriaId] || 1;
        await prisma.finalScore.upsert({
          where: { sessionId_criteriaId: { sessionId: id, criteriaId: cs.criteriaId } },
          create: {
            sessionId: id,
            criteriaId: cs.criteriaId,
            score: cs.score,
            gap: calculateGap(cs.score, standard),
            source: 'AI'
          },
          update: {
            score: cs.score,
            gap: calculateGap(cs.score, standard),
            source: 'AI'
          }
        });
      }

      await prisma.assessmentSession.update({
        where: { id },
        data: { status: 'AI_SCORED' }
      });

      await prisma.scoreVersionHistory.create({
        data: {
          sessionId: id,
          changedById: req.user!.id,
          changeType: 'AI_SCORE',
          newValues: JSON.stringify(output)
        }
      });

      res.json({ message: 'สนทนาเสร็จสิ้น AI ประเมินเรียบร้อย', status: 'AI_SCORED' });
    } catch (aiError: any) {
      console.error(`[Assessment ${id}] Voice-chat AI evaluation error:`, aiError.message);
      await prisma.assessmentSession.update({ where: { id }, data: { status: 'AI_FAILED' } });
      await prisma.aIScore.create({
        data: {
          sessionId: id,
          criteriaScores: JSON.stringify([]),
          valid: false,
          retryCount: 2,
          rawResponse: aiError.message
        }
      });
      res.status(200).json({ message: 'บันทึกบทสนทนาเรียบร้อย แต่ AI ไม่สามารถประเมินได้', status: 'AI_FAILED' });
    }
  } catch (error) {
    console.error('Submit conversation error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
