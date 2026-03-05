import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAuditLog } from '../controllers/auditController.js';

const router = Router();
router.use(protect);
router.get('/', getAuditLog);

export default router;
