import mongoose from 'mongoose';

const voucherItemSchema = new mongoose.Schema(
  {
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    description: { type: String },
  },
  { _id: false }
);

const voucherSchema = new mongoose.Schema(
  {
    voucher_number: { type: String, required: true },
    voucher_type: {
      type: String,
      enum: [
        'cash_receipt',
        'cash_payment',
        'bank_receipt',
        'bank_payment',
        'journal',
        'contra',
        'pdc_receipt',
        'pdc_payment',
      ],
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    items: { type: [voucherItemSchema], default: [] },
    total_debit: { type: Number, required: true, min: 0 },
    total_credit: { type: Number, required: true, min: 0 },
    narration: { type: String },
    reference_no: { type: String, trim: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

voucherSchema.index({ station_id: 1, voucher_number: 1 }, { unique: true });

export default mongoose.model('Voucher', voucherSchema);
