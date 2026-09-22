import { Router } from 'express';
import { createInvoice, createInvoiceFromBooking, getInvoices } from '../controllers/invoiceController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.post('/', createInvoice);
router.post('/from-booking/:bookingId', createInvoiceFromBooking);
router.get('/', getInvoices);

export default router;