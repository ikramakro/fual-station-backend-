import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema(
  {
    mm: { type: Number, required: true, min: 0 },
    liters: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const dipCalibrationChartSchema = new mongoose.Schema(
  {
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', required: true, unique: true },
    entries: { type: [entrySchema], default: [] },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('DipCalibrationChart', dipCalibrationChartSchema);
