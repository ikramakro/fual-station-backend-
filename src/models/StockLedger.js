import mongoose from 'mongoose';
import { STOCK_TRANSACTION_TYPES } from '../utils/constants.js';

const stockLedgerSchema = new mongoose.Schema(
  {
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    tank_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tank' },
    transaction_type: { type: String, enum: STOCK_TRANSACTION_TYPES, required: true },
    reference_id: { type: mongoose.Schema.Types.ObjectId },
    reference_type: { type: String },
    quantity_in: { type: Number, default: 0, min: 0 },
    quantity_out: { type: Number, default: 0, min: 0 },
    balance_after: { type: Number, required: true, min: 0 },
    unit_price: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockLedgerSchema.index({ station_id: 1, product_id: 1, createdAt: -1 });

export default mongoose.model('StockLedger', stockLedgerSchema);
