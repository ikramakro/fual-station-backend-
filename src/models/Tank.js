import mongoose from 'mongoose';
import { FUEL_TYPES } from '../utils/constants.js';

const tankSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    fuel_type: { type: String, enum: FUEL_TYPES, required: true },
    capacity_liters: { type: Number, required: true, min: 0 },
    current_stock_liters: { type: Number, required: true, min: 0, default: 0 },
    min_stock_threshold: { type: Number, required: true, min: 0 },
    is_underground: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

tankSchema.index({ station_id: 1, code: 1 }, { unique: true });

export default mongoose.model('Tank', tankSchema);
