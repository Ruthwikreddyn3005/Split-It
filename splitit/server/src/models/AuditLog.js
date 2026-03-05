import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action:       { type: String, required: true }, // 'expense_added' | 'expense_edited' | 'expense_deleted' | 'settlement_added' | 'settlement_deleted'
    group:        { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    // For friend (non-group) activity — stores both participant IDs for easy querying
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    performedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId:     { type: mongoose.Schema.Types.ObjectId, required: true }, // expense or settlement _id
    meta: {
      description: { type: String, default: '' },
      amount:      { type: Number, default: 0 },
      currency:    { type: String, default: 'USD' },
      paidByName:  { type: String, default: '' },
      memberNames: [{ type: String }],
      note:        { type: String, default: '' }, // for settlements
    },
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', auditLogSchema);
