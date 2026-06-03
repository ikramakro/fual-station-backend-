import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
    unit: { type: String, required: true, enum: ['liter', 'kg', 'piece'] },
    current_price: { type: Number, required: true, min: 0 },
    is_fuel: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

productSchema.index({ station_id: 1, name: 1 });

export default mongoose.model('Product', productSchema);
