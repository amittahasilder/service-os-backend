import { Router } from 'express';
import { createService, getServices, updateService, deleteService } from '../controllers/serviceController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

// এই সব রুটের জন্য লগইন ও টোকেন বাধ্যতামূলক
router.use(protect);

router.post('/', createService);
router.get('/', getServices);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

export default router;