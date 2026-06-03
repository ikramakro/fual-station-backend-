import mongoose from 'mongoose';

const productCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    is_returnable: { type: Boolean, default: false },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  },
  { timestamps: true }
);

productCategorySchema.index({ station_id: 1, name: 1 });

export default mongoose.model('ProductCategory', productCategorySchema);
