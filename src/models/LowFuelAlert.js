import mongoose from 'mongoose';

const lowFuelAlertSchema = new mongoose.Schema(
  {
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    current_stock_liters: { type: Number, required: true },
    capacity_liters: { type: Number, required: true },
    threshold_pct: { type: Number, required: true },
    percentage: { type: Number, required: true },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    channels_notified: { type: [String], default: ['in_app'] },
    resolved_at: { type: Date },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

lowFuelAlertSchema.index({ station_id: 1, status: 1, createdAt: -1 });

export default mongoose.model('LowFuelAlert', lowFuelAlertSchema);
