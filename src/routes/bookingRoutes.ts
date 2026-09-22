import { Router } from 'express';
import { createBooking, getBookings, updateBookingStatus } from '../controllers/bookingController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

// বুকিং দেখার এবং ম্যানেজ করার জন্য অথেনটিকেশন চেক
router.use(protect);

router.post('/', createBooking);
router.get('/', getBookings);
router.patch('/:id/status', updateBookingStatus);

export default router;