import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity_ordered: { type: Number, required: true, min: 0 },
    quantity_received: { type: Number, default: 0, min: 0 },
    unit_price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank' },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    po_number: { type: String, required: true },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    items: { type: [poItemSchema], default: [] },
    delivery_vehicle_no: { type: String, trim: true },
    driver_name: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'ordered', 'received', 'partial', 'cancelled'],
      default: 'draft',
    },
    total_amount: { type: Number, default: 0, min: 0 },
    notes: { type: String },
    ordered_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ordered_at: { type: Date },
    received_at: { type: Date },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ station_id: 1, po_number: 1 }, { unique: true });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
