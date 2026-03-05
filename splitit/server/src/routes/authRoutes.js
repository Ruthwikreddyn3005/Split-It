import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';

const router = Router();

router.post('/register',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
  validate,
  register
);

router.get('/verify-email/:token', verifyEmail);

router.post('/resend-verification',
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  resendVerification
);

router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
  login
);

router.post('/refresh', refresh);

router.post('/logout', protect, logout);

router.post('/forgot-password',
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  forgotPassword
);

router.post('/reset-password/:token',
  body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
  validate,
  resetPassword
);

export default router;
