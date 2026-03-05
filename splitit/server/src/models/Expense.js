import mongoose from 'mongoose';

const splitEntrySchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    group:       { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    directWith:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    description: { type: String, required: true, trim: true },
    amount:      { type: Number, required: true },
    currency:    { type: String, default: 'USD' },
    paidBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    splitType:   { type: String, enum: ['equal', 'exact', 'percentage'], default: 'equal' },
    splits:      [splitEntrySchema],
    date:        { type: Date, default: Date.now },
    category:    { type: String, default: 'general' },
    notes:       { type: String, default: '' },
    isDeleted:   { type: Boolean, default: false },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
