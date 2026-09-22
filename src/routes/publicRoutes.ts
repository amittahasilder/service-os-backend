import { Router } from 'express';
import { getPublicBusinessData, getAvailableSlots, createPublicBooking } from '../controllers/publicController.js';

const router = Router();

router.get('/:slug', getPublicBusinessData);
router.get('/:slug/slots', getAvailableSlots);
router.post('/:slug/book', createPublicBooking);

export default router;