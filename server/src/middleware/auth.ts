import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
  departmentId: string | null;
  experienceLevel: string;
}

export interface AuthRequest extends Request<Record<string, string>, any, any, any> {
  user?: AuthUser;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ (Authentication required)' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token ไม่ถูกต้อง (Invalid token)' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง (Access denied)' });
      return;
    }
    next();
  };
}
