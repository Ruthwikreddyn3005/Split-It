import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon:        { type: String, default: 'users' },
    currency:    { type: String, default: 'USD' },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role:     { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Group', groupSchema);
