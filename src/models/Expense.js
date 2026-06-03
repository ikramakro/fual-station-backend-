import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['fuel', 'salary', 'utility', 'maintenance', 'rent', 'office', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true },
    expense_date: { type: Date, required: true, default: Date.now },
    payment_method: { type: String, enum: ['cash', 'bank'], required: true },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
