import Tank from '../models/Tank.js';
import StockLedger from '../models/StockLedger.js';
import { emitTankLevelUpdate } from './socketService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function recordStockMovement({
  stationId,
  productId,
  tankId,
  transactionType,
  referenceId,
  referenceType,
  quantityIn = 0,
  quantityOut = 0,
  unitPrice = 0,
  userId,
}) {
  let balanceAfter = 0;

  if (tankId) {
    const tank = await Tank.findOne({ _id: tankId, station_id: stationId });
    if (!tank) throw new AppError('Tank not found', 404);

    if (quantityOut > 0 && tank.current_stock_liters < quantityOut) {
      throw new AppError(`Insufficient stock in tank ${tank.name}`, 400);
    }

    tank.current_stock_liters += quantityIn - quantityOut;
    await tank.save();
    balanceAfter = tank.current_stock_liters;
    emitTankLevelUpdate(stationId, tank);
  }

  return StockLedger.create({
    station_id: stationId,
    product_id: productId,
    tank_id: tankId,
    transaction_type: transactionType,
    reference_id: referenceId,
    reference_type: referenceType,
    quantity_in: quantityIn,
    quantity_out: quantityOut,
    balance_after: balanceAfter,
    unit_price: unitPrice,
    created_by: userId,
  });
}

export async function receivePurchaseStock({ stationId, items, referenceId, userId }) {
  const entries = [];
  for (const item of items) {
    const qty = item.quantity_received || item.quantity;
    if (!qty || qty <= 0) continue;
    const entry = await recordStockMovement({
      stationId,
      productId: item.product_id,
      tankId: item.tank_id,
      transactionType: 'purchase',
      referenceId,
      referenceType: 'PurchaseOrder',
      quantityIn: qty,
      unitPrice: item.unit_price,
      userId,
    });
    entries.push(entry);
  }
  return entries;
}

export async function deductSaleStock({ stationId, items, referenceId, userId }) {
  const entries = [];
  for (const item of items) {
    if (!item.tank_id) continue;
    const entry = await recordStockMovement({
      stationId,
      productId: item.product_id,
      tankId: item.tank_id,
      transactionType: 'sale',
      referenceId,
      referenceType: 'Sale',
      quantityOut: item.quantity,
      unitPrice: item.unit_price,
      userId,
    });
    entries.push(entry);
  }
  return entries;
}

export async function reverseSaleStock({ stationId, items, referenceId, userId }) {
  const entries = [];
  for (const item of items) {
    if (!item.tank_id) continue;
    const entry = await recordStockMovement({
      stationId,
      productId: item.product_id,
      tankId: item.tank_id,
      transactionType: 'adjustment',
      referenceId,
      referenceType: 'SaleVoid',
      quantityIn: item.quantity,
      unitPrice: item.unit_price,
      userId,
    });
    entries.push(entry);
  }
  return entries;
}

export async function returnPurchaseStock({ stationId, items, referenceId, userId }) {
  const entries = [];
  for (const item of items) {
    const entry = await recordStockMovement({
      stationId,
      productId: item.product_id,
      tankId: item.tank_id,
      transactionType: 'return',
      referenceId,
      referenceType: 'PurchaseReturn',
      quantityOut: item.quantity,
      unitPrice: item.unit_price,
      userId,
    });
    entries.push(entry);
  }
  return entries;
}

export async function getTankStockHistory(tankId, limit = 20) {
  return StockLedger.find({ tank_id: tankId }).sort({ createdAt: -1 }).limit(limit);
}

export async function recordGainLossStock({ stationId, tankId, productId, type, quantity, referenceId, userId }) {
  const transactionType = type === 'gain' ? 'gain' : 'loss';
  return recordStockMovement({
    stationId,
    productId,
    tankId,
    transactionType,
    referenceId,
    referenceType: 'GainLossVoucher',
    quantityIn: type === 'gain' ? quantity : 0,
    quantityOut: type === 'loss' ? quantity : 0,
    userId,
  });
}

export async function transferStock({
  stationId,
  fromTankId,
  toTankId,
  productId,
  quantity,
  referenceId,
  userId,
}) {
  if (fromTankId === toTankId) throw new AppError('Source and destination tanks must differ', 400);

  const outEntry = await recordStockMovement({
    stationId,
    productId,
    tankId: fromTankId,
    transactionType: 'transfer',
    referenceId,
    referenceType: 'StockTransfer',
    quantityOut: quantity,
    userId,
  });

  const inEntry = await recordStockMovement({
    stationId,
    productId,
    tankId: toTankId,
    transactionType: 'transfer',
    referenceId,
    referenceType: 'StockTransfer',
    quantityIn: quantity,
    userId,
  });

  return { outEntry, inEntry };
}
