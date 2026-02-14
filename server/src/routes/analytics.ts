import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

// GET /api/analytics/summary - Overall summary
router.get('/summary', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalAssessments = await prisma.assessmentSession.count();
    const completedAssessments = await prisma.assessmentSession.count({
      where: { status: { in: ['AI_SCORED', 'REVIEWED', 'APPROVED'] } }
    });
    const approvedAssessments = await prisma.assessmentSession.count({
      where: { status: 'APPROVED' }
    });
    const totalNurses = await prisma.user.count({ where: { role: 'NURSE', active: true } });
    const totalCases = await prisma.case.count({ where: { active: true } });

    res.json({
      totalAssessments,
      completedAssessments,
      approvedAssessments,
      totalNurses,
      totalCases
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/analytics/competency-by-category
router.get('/competency-by-category', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, department, experienceLevel } = req.query;

    const where: any = { status: { in: ['AI_SCORED', 'REVIEWED', 'APPROVED'] } };
    if (dateFrom) where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo as string) };
    if (experienceLevel) where.experienceLevel = experienceLevel;
    if (department) {
      where.nurse = { departmentId: department };
    }

    const sessions = await prisma.assessmentSession.findMany({
      where,
      include: {
        finalScores: {
          include: { criteria: { include: { group: true } } }
        }
      }
    });

    // Aggregate by group
    const groupScores: Record<string, { nameTh: string; nameEn: string; scores: number[] }> = {};
    for (const session of sessions) {
      for (const fs of session.finalScores) {
        const groupId = fs.criteria.groupId;
        if (!groupScores[groupId]) {
          groupScores[groupId] = {
            nameTh: fs.criteria.group.nameTh,
            nameEn: fs.criteria.group.nameEn,
            scores: []
          };
        }
        groupScores[groupId].scores.push(fs.score);
      }
    }

    const result = Object.entries(groupScores).map(([groupId, data]) => ({
      groupId,
      nameTh: data.nameTh,
      nameEn: data.nameEn,
      averageScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100,
      count: data.scores.length
    }));

    res.json(result);
  } catch (error) {
    console.error('Competency by category error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/analytics/weaknesses - Top weakness areas
router.get('/weaknesses', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, department } = req.query;

    const where: any = { status: { in: ['AI_SCORED', 'REVIEWED', 'APPROVED'] } };
    if (dateFrom) where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo as string) };
    if (department) where.nurse = { departmentId: department };

    const sessions = await prisma.assessmentSession.findMany({
      where,
      include: {
        finalScores: {
          include: { criteria: { include: { group: true } } }
        }
      }
    });

    // Aggregate by criteria and calculate average GAP
    const criteriaGaps: Record<string, { nameTh: string; nameEn: string; groupNameTh: string; gaps: number[] }> = {};
    for (const session of sessions) {
      for (const fs of session.finalScores) {
        if (!criteriaGaps[fs.criteriaId]) {
          criteriaGaps[fs.criteriaId] = {
            nameTh: fs.criteria.nameTh,
            nameEn: fs.criteria.nameEn,
            groupNameTh: fs.criteria.group.nameTh,
            gaps: []
          };
        }
        criteriaGaps[fs.criteriaId].gaps.push(fs.gap);
      }
    }

    const result = Object.entries(criteriaGaps)
      .map(([criteriaId, data]) => ({
        criteriaId,
        nameTh: data.nameTh,
        nameEn: data.nameEn,
        groupNameTh: data.groupNameTh,
        averageGap: Math.round((data.gaps.reduce((a, b) => a + b, 0) / data.gaps.length) * 100) / 100,
        count: data.gaps.length
      }))
      .sort((a, b) => a.averageGap - b.averageGap) // worst gaps first
      .slice(0, 10);

    res.json(result);
  } catch (error) {
    console.error('Weaknesses error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/analytics/trends - Score trends over time
router.get('/trends', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, experienceLevel } = req.query;

    const where: any = { status: { in: ['AI_SCORED', 'REVIEWED', 'APPROVED'] } };
    if (experienceLevel) where.experienceLevel = experienceLevel;
    if (department) where.nurse = { departmentId: department };

    const sessions = await prisma.assessmentSession.findMany({
      where,
      include: {
        finalScores: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by month
    const monthlyScores: Record<string, number[]> = {};
    for (const session of sessions) {
      const month = session.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyScores[month]) monthlyScores[month] = [];
      const avgScore = session.finalScores.length > 0
        ? session.finalScores.reduce((sum, fs) => sum + fs.score, 0) / session.finalScores.length
        : 0;
      monthlyScores[month].push(avgScore);
    }

    const result = Object.entries(monthlyScores).map(([month, scores]) => ({
      month,
      averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      count: scores.length
    }));

    res.json(result);
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/analytics/departments - Department comparison
router.get('/departments', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({ where: { active: true } });
    
    const result = [];
    for (const dept of departments) {
      const sessions = await prisma.assessmentSession.findMany({
        where: {
          status: { in: ['AI_SCORED', 'REVIEWED', 'APPROVED'] },
          nurse: { departmentId: dept.id }
        },
        include: { finalScores: true }
      });

      const allScores = sessions.flatMap(s => s.finalScores.map(fs => fs.score));
      const allGaps = sessions.flatMap(s => s.finalScores.map(fs => fs.gap));

      result.push({
        departmentId: dept.id,
        name: dept.name,
        nameTh: dept.nameTh,
        assessmentCount: sessions.length,
        averageScore: allScores.length > 0 
          ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100 
          : 0,
        averageGap: allGaps.length > 0 
          ? Math.round((allGaps.reduce((a, b) => a + b, 0) / allGaps.length) * 100) / 100 
          : 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Departments analytics error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/analytics/summary-results - Summary of Results matrix 
// (matches Sheet 5 "Summary of results" from the real evaluation form)
router.get('/summary-results', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.query;

    // Get all competency groups (including Core)
    const competencyGroups = await prisma.competencyGroup.findMany({
      where: { active: true },
      include: {
        criteria: { where: { active: true }, orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // Get approved assessments
    const sessionWhere: any = { status: 'APPROVED' };
    if (departmentId) {
      sessionWhere.nurse = { departmentId: departmentId as string };
    }

    const sessions = await prisma.assessmentSession.findMany({
      where: sessionWhere,
      include: {
        nurse: { select: { id: true, name: true, nameTh: true, department: true, experienceLevel: true } },
        finalScores: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get standard levels
    const standardLevels = await prisma.standardLevel.findMany();

    // Group sessions by experience level (like the real Summary of Results)
    const levelGroups: Record<string, any[]> = {
      LEVEL_1: [], LEVEL_2: [], LEVEL_3: [], LEVEL_4: [], LEVEL_5: []
    };

    for (const session of sessions) {
      const standardMap: Record<string, number> = {};
      standardLevels
        .filter(sl => sl.experienceLevel === session.experienceLevel)
        .forEach(sl => { standardMap[sl.criteriaId] = sl.standardScore; });

      const nurseScores: Record<string, { score: number; gap: number; standard: number }> = {};
      for (const fs of session.finalScores) {
        nurseScores[fs.criteriaId] = {
          score: fs.score,
          gap: fs.gap,
          standard: standardMap[fs.criteriaId] || 1
        };
      }

      const level = session.experienceLevel;
      if (levelGroups[level]) {
        levelGroups[level].push({
          sessionId: session.id,
          nurseName: session.nurse?.nameTh || session.nurse?.name || '-',
          department: session.nurse?.department?.nameTh || '-',
          scores: nurseScores
        });
      }
    }

    res.json({
      competencyGroups,
      levelGroups,
      standardLevels
    });
  } catch (error) {
    console.error('Summary results error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
