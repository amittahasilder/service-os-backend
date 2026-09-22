import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/analyticsController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.get('/metrics', getDashboardMetrics);

export default router;