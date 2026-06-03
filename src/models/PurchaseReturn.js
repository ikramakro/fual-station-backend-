import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unit_price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank' },
  },
  { _id: false }
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    return_number: { type: String, required: true },
    purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: { type: [returnItemSchema], default: [] },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

purchaseReturnSchema.index({ station_id: 1, return_number: 1 }, { unique: true });

export default mongoose.model('PurchaseReturn', purchaseReturnSchema);
