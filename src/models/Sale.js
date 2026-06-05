import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unit_price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank' },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    sale_number: { type: String, required: true },
    sale_type: { type: String, enum: ['nozzle', 'bulk', 'credit', 'lubricant'], required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerVehicle' },
    shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    nozzle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Nozzle' },
    items: { type: [saleItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total_amount: { type: Number, required: true, min: 0 },
    payment_method: {
      type: String,
      enum: ['cash', 'card', 'credit', 'cheque', 'mobile'],
      required: true,
    },
    amount_paid: { type: Number, default: 0, min: 0 },
    change_given: { type: Number, default: 0, min: 0 },
    cashier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    notes: { type: String },
    is_void: { type: Boolean, default: false },
    voided_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    void_reason: { type: String },
    offline_id: { type: String },
    is_offline: { type: Boolean, default: false },
    synced_at: { type: Date },
  },
  { timestamps: true }
);

saleSchema.index({ station_id: 1, sale_number: 1 }, { unique: true });
saleSchema.index({ station_id: 1, offline_id: 1 }, { unique: true, sparse: true });
saleSchema.index({ station_id: 1, createdAt: -1 });

export default mongoose.model('Sale', saleSchema);
