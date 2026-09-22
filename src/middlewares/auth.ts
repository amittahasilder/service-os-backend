import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    businessId: string;
    role: string;
  };
}

interface JwtPayload {
  userId: string;
  businessId: string;
  role: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, message: 'Not authorized, token missing' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_serviceos_key_2026') as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};