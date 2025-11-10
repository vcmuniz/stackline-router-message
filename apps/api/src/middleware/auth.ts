import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

export interface AuthRequest extends Request {
  userId?: number;
  prisma?: any;
  headers: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === 'string' || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    req.userId = Number(decoded.sub);

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};