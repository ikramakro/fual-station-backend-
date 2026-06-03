import mongoose from 'mongoose';

const salePaymentSchema = new mongoose.Schema(
  {
    sale_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    payment_method: {
      type: String,
      enum: ['cash', 'card', 'credit', 'cheque', 'mobile'],
      required: true,
    },
    reference_no: { type: String, trim: true },
    payment_date: { type: Date, required: true, default: Date.now },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('SalePayment', salePaymentSchema);
