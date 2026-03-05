import { verifyAccessToken } from '../utils/tokenUtils.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    if (!token) throw new ApiError(401, 'Not authenticated');

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');
    if (!user) throw new ApiError(401, 'User not found');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired'));
    }
    next(err instanceof ApiError ? err : new ApiError(401, 'Invalid token'));
  }
}
