import mongoose from 'mongoose';

const customerVehicleSchema = new mongoose.Schema(
  {
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    vehicle_number: { type: String, required: true, trim: true },
    vehicle_type: { type: String, default: 'car' },
    fuel_type: { type: String, trim: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('CustomerVehicle', customerVehicleSchema);
