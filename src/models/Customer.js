import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    customer_type: {
      type: String,
      enum: ['walk_in', 'credit', 'bulk', 'corporate'],
      default: 'walk_in',
    },
    credit_limit: { type: Number, default: 0, min: 0 },
    credit_days: { type: Number, default: 0, min: 0 },
    current_balance: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

customerSchema.index({ station_id: 1, phone: 1 });

export default mongoose.model('Customer', customerSchema);
