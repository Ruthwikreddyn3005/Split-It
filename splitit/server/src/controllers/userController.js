import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import { hashToken } from '../utils/tokenUtils.js';

export async function getMe(req, res, next) {
  try {
    ok(res, { user: req.user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { name, avatar, currency, username } = req.body;

    if (username !== undefined) {
      const clean = username.toLowerCase().trim();
      if (!/^[a-z0-9]+$/.test(clean)) {
        throw new ApiError(400, 'Username can only contain letters and numbers');
      }
      if (clean.length < 3 || clean.length > 20) {
        throw new ApiError(400, 'Username must be 3–20 characters');
      }
      const taken = await User.findOne({ username: clean, _id: { $ne: req.user._id } });
      if (taken) throw new ApiError(409, 'Username already taken');
    }

    const updates = { name, avatar, currency };
    if (username !== undefined) updates.username = username.toLowerCase().trim();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true, select: '-passwordHash -refreshTokens' }
    );
    ok(res, { user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    const rawRefresh = req.cookies?.refreshToken;
    const currentHash = rawRefresh ? hashToken(rawRefresh) : null;

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // Invalidate all other sessions
    user.refreshTokens = currentHash
      ? user.refreshTokens.filter((t) => t === currentHash)
      : [];
    await user.save();

    ok(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

export async function updateTheme(req, res, next) {
  try {
    const { theme } = req.body;
    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new ApiError(400, 'Invalid theme');
    }
    await User.findByIdAndUpdate(req.user._id, { theme });
    ok(res, { theme });
  } catch (err) {
    next(err);
  }
}

export async function searchUsers(req, res, next) {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return ok(res, { users: [] });

    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.user._id },
      isEmailVerified: true,
    })
      .select('name email username avatar')
      .limit(10);

    ok(res, { users });
  } catch (err) {
    next(err);
  }
}
