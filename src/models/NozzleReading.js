import mongoose from 'mongoose';

const nozzleReadingSchema = new mongoose.Schema(
  {
    nozzle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Nozzle', required: true },
    shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    opening_reading: { type: Number, required: true, min: 0 },
    closing_reading: { type: Number, min: 0 },
    test_reading: { type: Number, default: 0, min: 0 },
    liters_dispensed: { type: Number, default: 0, min: 0 },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

nozzleReadingSchema.pre('save', function computeLiters(next) {
  if (this.closing_reading != null) {
    const test = this.test_reading || 0;
    this.liters_dispensed = Math.max(0, this.closing_reading - this.opening_reading - test);
  }
  next();
});

export default mongoose.model('NozzleReading', nozzleReadingSchema);
