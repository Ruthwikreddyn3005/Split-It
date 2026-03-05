import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/authMiddleware.js';
import { getMe, updateMe, changePassword, updateTheme, searchUsers } from '../controllers/userController.js';

const router = Router();

router.use(protect);

router.get('/me', getMe);
router.put('/me', updateMe);

router.put('/me/password',
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password min 8 characters'),
  validate,
  changePassword
);

router.put('/me/theme', updateTheme);
router.get('/search', searchUsers);

export default router;
