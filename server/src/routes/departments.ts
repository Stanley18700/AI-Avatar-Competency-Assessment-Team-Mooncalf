import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/departments
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where: { active: true },
      include: { 
        clinicalIssues: { where: { active: true } },
        _count: { select: { users: true, cases: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (error) {
    console.error('List departments error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/departments
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, nameEn, nameTh, code } = req.body;
    const dept = await prisma.department.create({ data: { name: name || nameEn || '', nameTh: nameTh || '', code: code || '' } });
    res.status(201).json(dept);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/departments/:id
router.patch('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, nameEn, nameTh, code, active } = req.body;
    const dept = await prisma.department.update({
      where: { id },
      data: { ...((name || nameEn) && { name: name || nameEn }), ...(nameTh && { nameTh }), ...(code && { code }), ...(active !== undefined && { active }) }
    });
    res.json(dept);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/departments/:id/clinical-issues
router.post('/:id/clinical-issues', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { criteriaId, nameTh, nameEn, description } = req.body;
    const issue = await prisma.departmentClinicalIssue.create({
      data: { departmentId: id, criteriaId, nameTh, nameEn, description }
    });
    res.status(201).json(issue);
  } catch (error) {
    console.error('Create clinical issue error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.department.update({ where: { id }, data: { active: false } });
    res.json({ message: 'ลบแผนกเรียบร้อย' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
