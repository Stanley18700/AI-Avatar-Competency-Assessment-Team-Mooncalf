import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/cases - List cases
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const where: any = {};
    if (req.user!.role === 'NURSE') {
      where.active = true;
    }
    const cases = await prisma.case.findMany({
      where,
      include: { department: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cases);
  } catch (error) {
    console.error('List cases error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/cases/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const c = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { department: true }
    });
    if (!c) {
      res.status(404).json({ error: 'ไม่พบกรณีศึกษา' });
      return;
    }
    res.json(c);
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/cases - Create case (admin)
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, titleTh, descriptionTh, descriptionEn, reasoningIndicators, linkedCriteriaIds, departmentId } = req.body;
    
    if (!title || !descriptionTh || !descriptionEn) {
      res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }

    const newCase = await prisma.case.create({
      data: {
        title,
        titleTh,
        descriptionTh,
        descriptionEn,
        reasoningIndicators: JSON.stringify(reasoningIndicators || []),
        linkedCriteriaIds: JSON.stringify(linkedCriteriaIds || []),
        departmentId
      },
      include: { department: true }
    });
    res.status(201).json(newCase);
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/cases/:id
router.patch('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, titleTh, descriptionTh, descriptionEn, reasoningIndicators, linkedCriteriaIds, departmentId, active } = req.body;
    
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (titleTh !== undefined) data.titleTh = titleTh;
    if (descriptionTh !== undefined) data.descriptionTh = descriptionTh;
    if (descriptionEn !== undefined) data.descriptionEn = descriptionEn;
    if (reasoningIndicators !== undefined) data.reasoningIndicators = JSON.stringify(reasoningIndicators);
    if (linkedCriteriaIds !== undefined) data.linkedCriteriaIds = JSON.stringify(linkedCriteriaIds);
    if (departmentId !== undefined) data.departmentId = departmentId;
    if (active !== undefined) data.active = active;

    const updated = await prisma.case.update({
      where: { id },
      data,
      include: { department: true }
    });
    res.json(updated);
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/cases/:id - Soft disable
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.case.update({
      where: { id: req.params.id },
      data: { active: false }
    });
    res.json({ message: 'ปิดการใช้งานกรณีศึกษาเรียบร้อย' });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
