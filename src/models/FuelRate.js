import mongoose from 'mongoose';

const fuelRateSchema = new mongoose.Schema(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    price_per_liter: { type: Number, required: true, min: 0 },
    effective_from: { type: Date, required: true, default: Date.now },
    effective_to: { type: Date, default: null },
    set_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

fuelRateSchema.index({ station_id: 1, product_id: 1, effective_from: -1 });

export default mongoose.model('FuelRate', fuelRateSchema);
