import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    group:      { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    directWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    paidBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paidTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:     { type: Number, required: true },
    currency:   { type: String, default: 'USD' },
    note:       { type: String, default: '' },
    date:       { type: Date, default: Date.now },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expenseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Settlement', settlementSchema);
