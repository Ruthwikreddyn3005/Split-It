// One-time script: marks ALL unverified users as verified (dev only)
// Run: node scripts/fix-unverified.js
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

await mongoose.connect(process.env.MONGODB_URI);

const result = await User.updateMany(
  { isEmailVerified: false },
  { $set: { isEmailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null } }
);

console.log(`Fixed ${result.modifiedCount} user(s).`);
await mongoose.disconnect();
