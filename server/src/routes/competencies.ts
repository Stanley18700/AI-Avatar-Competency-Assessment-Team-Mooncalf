import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/competencies - List all competency groups with criteria
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groups = await prisma.competencyGroup.findMany({
      where: { active: true },
      include: {
        criteria: {
          where: { active: true },
          include: { standardLevels: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(groups);
  } catch (error) {
    console.error('List competencies error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/competencies/ai-assessed - Only AI-assessed criteria
router.get('/ai-assessed', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groups = await prisma.competencyGroup.findMany({
      where: { active: true, assessedByAI: true },
      include: {
        criteria: {
          where: { active: true },
          include: { standardLevels: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(groups);
  } catch (error) {
    console.error('List AI competencies error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/competencies/groups - Create competency group (admin)
router.post('/groups', requireRole('ADMIN'), async (req: AuthRequest & { body: any }, res: Response): Promise<void> => {
  try {
    const { nameTh, nameEn, type, assessedByAI, sortOrder } = req.body;
    const group = await prisma.competencyGroup.create({
      data: { nameTh, nameEn, type, assessedByAI, sortOrder }
    });
    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/competencies/criteria - Create criteria (admin)
router.post('/criteria', requireRole('ADMIN'), async (req: AuthRequest & { body: any }, res: Response): Promise<void> => {
  try {
    const { groupId, nameTh, nameEn, description, sortOrder } = req.body;
    const criteria = await prisma.competencyCriteria.create({
      data: { groupId, nameTh, nameEn, description, sortOrder }
    });
    res.status(201).json(criteria);
  } catch (error) {
    console.error('Create criteria error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/competencies/criteria/:id - Update criteria (admin)
router.patch('/criteria/:id', requireRole('ADMIN'), async (req: AuthRequest & { body: any }, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nameTh, nameEn, description, sortOrder, active } = req.body;
    const data: any = {};
    if (nameTh !== undefined) data.nameTh = nameTh;
    if (nameEn !== undefined) data.nameEn = nameEn;
    if (description !== undefined) data.description = description;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (active !== undefined) data.active = active;

    const criteria = await prisma.competencyCriteria.update({
      where: { id },
      data
    });
    res.json(criteria);
  } catch (error) {
    console.error('Update criteria error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/competencies/standards - Bulk update standard levels (admin)
router.put('/standards', requireRole('ADMIN'), async (req: AuthRequest & { body: any }, res: Response): Promise<void> => {
  try {
    const { standards } = req.body; // [{experienceLevel, criteriaId, standardScore}]
    
    for (const s of standards) {
      await prisma.standardLevel.upsert({
        where: {
          experienceLevel_criteriaId: {
            experienceLevel: s.experienceLevel,
            criteriaId: s.criteriaId
          }
        },
        create: {
          experienceLevel: s.experienceLevel,
          criteriaId: s.criteriaId,
          standardScore: s.standardScore
        },
        update: { standardScore: s.standardScore }
      });
    }
    
    res.json({ message: 'อัพเดตเกณฑ์มาตรฐานเรียบร้อย' });
  } catch (error) {
    console.error('Update standards error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
