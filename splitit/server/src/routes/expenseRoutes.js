import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getExpenses, createExpense, getExpense, updateExpense, deleteExpense, getActivity } from '../controllers/expenseController.js';

const router = Router();
router.use(protect);

router.get('/activity', getActivity);
router.get('/', getExpenses);
router.post('/', createExpense);
router.get('/:id', getExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
