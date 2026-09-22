import { Router, Response } from 'express';
import { registerOwner, loginUser } from '../controllers/authController.js';
import { protect, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// পাবলিক রুটস
router.post('/register', registerOwner);
router.post('/login', loginUser);

// লগআউট রুট (কুকি ক্লিয়ার করা)
router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// সুরক্ষিত ভেরিফিকেশন রুট
router.get('/me', protect, (req: AuthRequest, res: Response) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;