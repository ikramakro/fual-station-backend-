import mongoose from 'mongoose';

const chequeSchema = new mongoose.Schema(
  {
    cheque_no: { type: String, required: true, trim: true },
    bank_name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    cheque_type: { type: String, enum: ['received', 'issued'], required: true },
    party_type: { type: String, enum: ['customer', 'supplier'], required: true },
    party_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    due_date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'presented', 'cleared', 'bounced'],
      default: 'pending',
    },
    bounce_reason: { type: String },
    voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Cheque', chequeSchema);
