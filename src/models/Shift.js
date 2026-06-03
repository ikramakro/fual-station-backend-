import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    shift_name: { type: String, enum: ['morning', 'evening', 'night'], required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    opened_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    opening_cash: { type: Number, required: true, min: 0 },
    closing_cash: { type: Number, min: 0 },
    total_sales: { type: Number, default: 0 },
    total_expenses: { type: Number, default: 0 },
    net_cash: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    opened_at: { type: Date, default: Date.now },
    closed_at: { type: Date },
    manager_approved: { type: Boolean, default: false },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

shiftSchema.index({ station_id: 1, status: 1 });

export default mongoose.model('Shift', shiftSchema);
