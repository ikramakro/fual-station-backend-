import mongoose from 'mongoose';

const nozzleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', required: true },
    is_active: { type: Boolean, default: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

nozzleSchema.index({ station_id: 1, code: 1 }, { unique: true });

export default mongoose.model('Nozzle', nozzleSchema);
