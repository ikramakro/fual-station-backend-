import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    account_type: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'income', 'expense'],
      required: true,
    },
    sub_type: { type: String, trim: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    opening_balance: { type: Number, default: 0 },
    current_balance: { type: Number, default: 0 },
    is_system: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

accountSchema.index({ station_id: 1, code: 1 }, { unique: true });

export default mongoose.model('Account', accountSchema);
