import mongoose from 'mongoose';

const dipReadingSchema = new mongoose.Schema(
  {
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank', required: true },
    reading_mm: { type: Number, required: true, min: 0 },
    calculated_liters: { type: Number, required: true, min: 0 },
    temperature: { type: Number },
    density: { type: Number },
    reading_date: { type: Date, required: true, default: Date.now },
    shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

dipReadingSchema.index({ station_id: 1, tank_id: 1, reading_date: -1 });

export default mongoose.model('DipReading', dipReadingSchema);
