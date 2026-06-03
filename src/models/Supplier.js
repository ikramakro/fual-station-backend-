import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contact_person: { type: String, trim: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    ntn: { type: String, trim: true },
    strn: { type: String, trim: true },
    credit_limit: { type: Number, default: 0, min: 0 },
    credit_days: { type: Number, default: 0, min: 0 },
    opening_balance: { type: Number, default: 0 },
    current_balance: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

supplierSchema.index({ station_id: 1, name: 1 });

export default mongoose.model('Supplier', supplierSchema);
