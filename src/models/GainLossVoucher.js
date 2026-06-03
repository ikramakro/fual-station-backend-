import mongoose from 'mongoose';

const gainLossVoucherSchema = new mongoose.Schema(
  {
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', required: true },
    shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    book_stock: { type: Number, required: true },
    physical_stock: { type: Number, required: true },
    difference: { type: Number, required: true },
    type: { type: String, enum: ['gain', 'loss'], required: true },
    reason: { type: String },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('GainLossVoucher', gainLossVoucherSchema);
