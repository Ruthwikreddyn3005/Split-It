import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getSettlements, createSettlement, deleteSettlement } from '../controllers/settlementController.js';

const router = Router();
router.use(protect);

router.get('/', getSettlements);
router.post('/', createSettlement);
router.delete('/:id', deleteSettlement);

export default router;
