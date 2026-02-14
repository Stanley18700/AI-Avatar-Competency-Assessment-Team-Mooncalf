import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/reports/:sessionId - Generate/get report data
router.get('/:sessionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await prisma.assessmentSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        nurse: { include: { department: true } },
        case: true,
        transcript: true,
        selfScores: { include: { criteria: { include: { group: true } } } },
        aiScore: true,
        reviewerScore: { include: { reviewer: { select: { name: true, nameTh: true } } } },
        finalScores: { include: { criteria: { include: { group: true } } } }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Check access: nurse can only see own, reviewer/admin can see all
    if (req.user!.role === 'NURSE' && session.nurseId !== req.user!.id) {
      res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }

    // Get standard levels
    const standardLevels = await prisma.standardLevel.findMany({
      where: { experienceLevel: session.experienceLevel }
    });

    // Get competency groups
    const competencyGroups = await prisma.competencyGroup.findMany({
      where: { assessedByAI: true, active: true },
      include: {
        criteria: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      session,
      standardLevels,
      competencyGroups,
      reportData: {
        nurseName: session.nurse.nameTh || session.nurse.name,
        department: session.nurse.department?.nameTh || session.nurse.department?.name || '-',
        caseTitle: session.case.titleTh || session.case.title,
        experienceLevel: session.experienceLevel,
        assessmentDate: session.createdAt,
        status: session.status,
        aiScore: session.aiScore,
        reviewerScore: session.reviewerScore,
        selfScores: session.selfScores,
        finalScores: session.finalScores,
        standardLevels
      }
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
