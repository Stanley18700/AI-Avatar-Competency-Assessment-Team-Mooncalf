import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users - List all users (admin only)
router.get('/', requireRole('ADMIN'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: { department: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      nameTh: u.nameTh,
      role: u.role,
      department: u.department,
      experienceLevel: u.experienceLevel,
      active: u.active,
      createdAt: u.createdAt
    })));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/users - Create user (admin only)
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, nameTh, role, departmentId, experienceLevel } = req.body;
    
    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        nameTh,
        role,
        departmentId,
        experienceLevel: experienceLevel || 'LEVEL_1'
      },
      include: { department: true }
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      nameTh: user.nameTh,
      role: user.role,
      department: user.department,
      experienceLevel: user.experienceLevel,
      active: user.active
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PATCH /api/users/:id - Update user (admin only)
router.patch('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, nameTh, role, departmentId, experienceLevel, active, password } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nameTh !== undefined) data.nameTh = nameTh;
    if (role !== undefined) data.role = role;
    if (departmentId !== undefined) data.departmentId = departmentId;
    if (experienceLevel !== undefined) data.experienceLevel = experienceLevel;
    if (active !== undefined) data.active = active;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { department: true }
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      nameTh: user.nameTh,
      role: user.role,
      department: user.department,
      experienceLevel: user.experienceLevel,
      active: user.active
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/users/:id - Soft disable user (admin only)
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { active: false }
    });
    res.json({ message: 'ปิดการใช้งานผู้ใช้เรียบร้อย' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
