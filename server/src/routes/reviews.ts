import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { calculateGap } from '../utils/scoreCalculator';
import { parseJsonFields } from '../utils/jsonParser';

const router = Router();
router.use(authenticate);

// GET /api/reviews/pending - Pending reviews
router.get('/pending', requireRole('REVIEWER', 'ADMIN'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.assessmentSession.findMany({
      where: { status: { in: ['AI_SCORED', 'REVIEWED'] } },
      include: {
        nurse: { select: { id: true, name: true, nameTh: true, department: true, experienceLevel: true } },
        case: true,
        aiScore: { select: { weightedTotal: true, confidenceScore: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reviews/:sessionId - Review detail
router.get('/:sessionId', requireRole('REVIEWER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await prisma.assessmentSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        nurse: { select: { id: true, name: true, nameTh: true, department: true, experienceLevel: true } },
        case: true,
        transcript: true,
        selfScores: { include: { criteria: { include: { group: true } } } },
        aiScore: true,
        reviewerScore: true,
        finalScores: { include: { criteria: { include: { group: true } } } },
        versionHistory: {
          include: { changedBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Get standard levels
    const standardLevels = await prisma.standardLevel.findMany({
      where: { experienceLevel: session.experienceLevel }
    });

    // Get all competency groups with criteria (including Core for reviewer)
    const competencyGroups = await prisma.competencyGroup.findMany({
      where: { active: true },
      include: {
        criteria: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      ...session,
      aiScore: parseJsonFields(session.aiScore, ['criteriaScores', 'categoryScores']),
      reviewerScore: parseJsonFields(session.reviewerScore, ['criteriaScores']),
      standardLevels,
      competencyGroups
    });
  } catch (error) {
    console.error('Get review detail error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/reviews/:sessionId/score - Submit reviewer scores
router.post('/:sessionId/score', requireRole('REVIEWER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { criteriaScores, feedbackText } = req.body; // criteriaScores: [{criteriaId, score}]

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { aiScore: true }
    });

    if (!session) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Store previous values for version history
    const previousReviewerScore = await prisma.reviewerScore.findUnique({
      where: { sessionId }
    });

    // Upsert reviewer score
    await prisma.reviewerScore.upsert({
      where: { sessionId },
      create: {
        sessionId,
        reviewerId: req.user!.id,
        criteriaScores: JSON.stringify(criteriaScores),
        feedbackText,
        approved: false
      },
      update: {
        reviewerId: req.user!.id,
        criteriaScores: JSON.stringify(criteriaScores),
        feedbackText
      }
    });

    // Update final scores with reviewer's values
    const standardLevels = await prisma.standardLevel.findMany({
      where: { experienceLevel: session.experienceLevel }
    });
    const standardMap: Record<string, number> = {};
    standardLevels.forEach(s => { standardMap[s.criteriaId] = s.standardScore; });

    for (const cs of criteriaScores) {
      const standard = standardMap[cs.criteriaId] || 1;
      const gap = calculateGap(cs.score, standard);
      await prisma.finalScore.upsert({
        where: { sessionId_criteriaId: { sessionId, criteriaId: cs.criteriaId } },
        create: { sessionId, criteriaId: cs.criteriaId, score: cs.score, gap, source: 'REVIEWER' },
        update: { score: cs.score, gap, source: 'REVIEWER' }
      });
    }

    // Version history
    await prisma.scoreVersionHistory.create({
      data: {
        sessionId,
        changedById: req.user!.id,
        changeType: 'REVIEWER_EDIT',
        previousValues: previousReviewerScore?.criteriaScores || null,
        newValues: JSON.stringify({ criteriaScores, feedbackText })
      }
    });

    await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { status: 'REVIEWED' }
    });

    res.json({ message: 'บันทึกการตรวจสอบเรียบร้อย' });
  } catch (error) {
    console.error('Submit review score error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/reviews/:sessionId/approve - Approve assessment
router.post('/:sessionId/approve', requireRole('REVIEWER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: { status: 'APPROVED' }
    });

    // Update reviewer score approved flag
    await prisma.reviewerScore.updateMany({
      where: { sessionId },
      data: { approved: true }
    });

    // Version history
    await prisma.scoreVersionHistory.create({
      data: {
        sessionId,
        changedById: req.user!.id,
        changeType: 'REVIEWER_APPROVE',
        newValues: JSON.stringify({ approved: true, approvedAt: new Date().toISOString() })
      }
    });

    res.json({ message: 'อนุมัติผลประเมินเรียบร้อย' });
  } catch (error) {
    console.error('Approve assessment error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reviews/:sessionId/history
router.get('/:sessionId/history', requireRole('REVIEWER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const history = await prisma.scoreVersionHistory.findMany({
      where: { sessionId: req.params.sessionId },
      include: { changedBy: { select: { name: true, nameTh: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
