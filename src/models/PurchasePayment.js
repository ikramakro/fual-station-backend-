import mongoose from 'mongoose';

const purchasePaymentSchema = new mongoose.Schema(
  {
    purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    payment_method: { type: String, enum: ['cash', 'cheque', 'bank_transfer'], required: true },
    reference_no: { type: String, trim: true },
    payment_date: { type: Date, required: true, default: Date.now },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('PurchasePayment', purchasePaymentSchema);
