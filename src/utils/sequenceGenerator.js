import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  key: { type: String, required: true },
  year: { type: Number, required: true },
  seq: { type: Number, default: 0 },
});

CounterSchema.index({ station_id: 1, key: 1, year: 1 }, { unique: true });

const Counter =
  mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

/**
 * Generate sequential document numbers per station/year.
 * @param {string} stationId
 * @param {string} key - e.g. 'PO', 'SALE', 'VOUCHER', 'RETURN'
 * @param {string} prefix - e.g. 'PO', 'SALE'
 */
export async function generateSequenceNumber(stationId, key, prefix) {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { station_id: stationId, key, year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const padded = String(counter.seq).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}
