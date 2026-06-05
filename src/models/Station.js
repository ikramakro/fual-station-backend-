import mongoose from 'mongoose';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from '../utils/constants.js';

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    ntn: { type: String, trim: true },
    strn: { type: String, trim: true },
    timezone: { type: String, default: DEFAULT_TIMEZONE },
    currency: { type: String, default: DEFAULT_CURRENCY },
    fiscal_year_start: { type: Number, min: 1, max: 12, default: 7 },
    low_fuel_alert_threshold_pct: { type: Number, min: 1, max: 100, default: 20 },
    alert_channels: {
      type: [String],
      enum: ['in_app', 'sms', 'email'],
      default: ['in_app'],
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Station', stationSchema);
