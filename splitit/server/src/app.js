import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import settlementRoutes from './routes/settlementRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Rate limit auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
