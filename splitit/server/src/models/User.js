import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true, trim: true },
    username:           { type: String, unique: true, sparse: true, lowercase: true, trim: true,
                          match: [/^[a-z0-9]+$/, 'Username can only contain letters and numbers'] },
    email:              { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:       { type: String, required: true },
    avatar:             { type: String, default: '' },
    currency:           { type: String, default: 'USD' },
    isEmailVerified:    { type: Boolean, default: false },
    emailVerifyToken:   { type: String, default: null },
    emailVerifyExpiry:  { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiry:{ type: Date, default: null },
    refreshTokens:      [{ type: String }],
    theme:              { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    friends:            [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);
