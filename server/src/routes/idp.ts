import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/idp/:sessionId - Get or auto-generate IDP for a session
router.get('/:sessionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        nurse: { include: { department: true } },
        case: true,
        finalScores: { include: { criteria: { include: { group: true } } } },
        idp: true
      }
    });

    if (!session) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    // Check access
    if (req.user!.role === 'NURSE' && session.nurseId !== req.user!.id) {
      res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
      return;
    }

    // If IDP exists, return it
    if (session.idp) {
      const items = JSON.parse(session.idp.items || '[]');
      res.json({
        ...session.idp,
        items,
        session: {
          id: session.id,
          status: session.status,
          experienceLevel: session.experienceLevel,
          nurseName: session.nurse.nameTh || session.nurse.name,
          department: session.nurse.department?.nameTh || session.nurse.department?.name || '-',
          assessmentDate: session.createdAt,
          caseTitle: session.case.titleTh || session.case.title
        }
      });
      return;
    }

    // Auto-generate IDP from final scores (competencies with gap > 0 or negative gap)
    const standardLevels = await prisma.standardLevel.findMany({
      where: { experienceLevel: session.experienceLevel }
    });
    const standardMap: Record<string, number> = {};
    standardLevels.forEach(s => { standardMap[s.criteriaId] = s.standardScore; });

    // Get all competency groups
    const competencyGroups = await prisma.competencyGroup.findMany({
      where: { active: true },
      include: {
        criteria: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // Build IDP items for ALL competencies (even those without final scores yet)
    const items: any[] = [];
    for (const group of competencyGroups) {
      for (const criteria of group.criteria) {
        const finalScore = session.finalScores.find(f => f.criteriaId === criteria.id);
        const standard = standardMap[criteria.id] || 1;
        const gap = finalScore ? finalScore.gap : 0;

        items.push({
          criteriaId: criteria.id,
          criteriaNameTh: criteria.nameTh,
          criteriaNameEn: criteria.nameEn,
          groupNameTh: group.nameTh,
          groupType: group.type,
          standardLevel: standard,
          score: finalScore?.score || 0,
          gap,
          // Development methods (per the real IDP Nurse form)
          trainingCourse: false,
          shortTermTraining: false,
          inHouseTraining: false,
          coaching: false,
          onTheJob: false,
          projectAssignment: false,
          selfLearning: false,
          otherMethod: '',
          coordinator: 'หัวหน้างาน (Supervisor)'
        });
      }
    }

    res.json({
      id: null,
      sessionId,
      items,
      notes: null,
      session: {
        id: session.id,
        status: session.status,
        experienceLevel: session.experienceLevel,
        nurseName: session.nurse.nameTh || session.nurse.name,
        department: session.nurse.department?.nameTh || session.nurse.department?.name || '-',
        assessmentDate: session.createdAt,
        caseTitle: session.case.titleTh || session.case.title
      }
    });
  } catch (error) {
    console.error('Get IDP error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/idp/:sessionId - Save IDP
router.post('/:sessionId', requireRole('REVIEWER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { items, notes } = req.body;

    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'ไม่พบการประเมิน' });
      return;
    }

    const idp = await prisma.individualDevelopmentPlan.upsert({
      where: { sessionId },
      create: {
        sessionId,
        items: JSON.stringify(items),
        notes
      },
      update: {
        items: JSON.stringify(items),
        notes
      }
    });

    res.json({ ...idp, items: JSON.parse(idp.items) });
  } catch (error) {
    console.error('Save IDP error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
