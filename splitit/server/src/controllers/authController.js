import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  setCookies,
  clearCookies,
} from '../utils/tokenUtils.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

export async function register(req, res, next) {
  try {
    const { name, username, email, password } = req.body;

    if (!username) throw new ApiError(400, 'Username is required');
    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9]+$/.test(cleanUsername)) {
      throw new ApiError(400, 'Username can only contain letters and numbers');
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      throw new ApiError(400, 'Username must be 3–20 characters');
    }

    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username: cleanUsername }),
    ]);
    if (emailExists) throw new ApiError(409, 'Email already registered');
    if (usernameExists) throw new ApiError(409, 'Username already taken');

    const passwordHash = await bcrypt.hash(password, 12);
    const rawToken = uuidv4();
    const hashedToken = hashToken(rawToken);

    // Only enforce email verification if SMTP is actually configured
    const emailConfigured = !!(process.env.SMTP_USER && !process.env.SMTP_USER.includes('your@'));

    const user = await User.create({
      name,
      username: cleanUsername,
      email,
      passwordHash,
      isEmailVerified: !emailConfigured,
      emailVerifyToken: emailConfigured ? hashedToken : null,
      emailVerifyExpiry: emailConfigured ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    });

    if (emailConfigured) {
      try {
        await sendVerificationEmail(email, name, rawToken);
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
      }
    }

    const message = emailConfigured
      ? 'Account created. Check your email to verify.'
      : 'Account created. You can log in immediately.';

    created(res, { email: user.email, emailConfigured }, message);
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const hashedToken = hashToken(req.params.token);
    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyExpiry: { $gt: Date.now() },
    });

    if (!user) throw new ApiError(400, 'Invalid or expired verification link');

    user.isEmailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyExpiry = null;
    await user.save();

    ok(res, {}, 'Email verified. You can now log in.');
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.isEmailVerified) {
      return ok(res, {}, 'If that email exists and is unverified, a link was sent.');
    }

    const rawToken = uuidv4();
    user.emailVerifyToken = hashToken(rawToken);
    user.emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(email, user.name, rawToken);
    ok(res, {}, 'Verification email sent.');
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new ApiError(403, 'Please verify your email before logging in');
    }

    const accessToken = signAccessToken({ userId: user._id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id });
    user.refreshTokens.push(hashToken(refreshToken));
    await user.save();

    setCookies(res, accessToken, refreshToken);

    ok(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        currency: user.currency,
        theme: user.theme,
      },
      accessToken,
      refreshToken,
    }, 'Logged in');
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawRefresh = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawRefresh) throw new ApiError(401, 'No refresh token');

    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefresh);
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const hashedIncoming = hashToken(rawRefresh);
    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokens.includes(hashedIncoming)) {
      throw new ApiError(401, 'Refresh token revoked');
    }

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== hashedIncoming);
    const newRefresh = signRefreshToken({ userId: user._id });
    user.refreshTokens.push(hashToken(newRefresh));
    await user.save();

    const newAccess = signAccessToken({ userId: user._id, email: user.email });
    setCookies(res, newAccess, newRefresh);

    ok(res, { accessToken: newAccess, refreshToken: newRefresh }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawRefresh = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawRefresh) {
      const user = await User.findById(req.user?._id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== hashToken(rawRefresh));
        await user.save();
      }
    }
    clearCookies(res);
    ok(res, {}, 'Logged out');
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond the same way to prevent email enumeration
    if (user && user.isEmailVerified) {
      const rawToken = uuidv4();
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
      await sendPasswordResetEmail(email, user.name, rawToken);
    }

    ok(res, {}, 'If that email exists, a reset link has been sent.');
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const hashedToken = hashToken(req.params.token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) throw new ApiError(400, 'Invalid or expired reset link');

    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    user.refreshTokens = []; // logout all devices
    await user.save();

    clearCookies(res);
    ok(res, {}, 'Password reset successful. Please log in.');
  } catch (err) {
    next(err);
  }
}
