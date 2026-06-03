import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchasePayment from '../models/PurchasePayment.js';
import PurchaseReturn from '../models/PurchaseReturn.js';
import Supplier from '../models/Supplier.js';
import { generateSequenceNumber } from '../utils/sequenceGenerator.js';
import { receivePurchaseStock, returnPurchaseStock } from '../services/stockService.js';
import * as accounting from '../services/accountingService.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildDateFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listOrders = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { station_id: req.user.station_id, ...buildDateFilter(req.query, 'createdAt') };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.supplier_id) filter.supplier_id = req.query.supplier_id;
  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter).populate('supplier_id', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
    PurchaseOrder.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const createOrder = async (req, res) => {
  const poNumber = await generateSequenceNumber(req.user.station_id, 'PO', 'PO');
  const items = req.body.items || [];
  const total_amount = items.reduce((s, i) => s + (i.subtotal || i.quantity_ordered * i.unit_price), 0);
  const order = await PurchaseOrder.create({
    ...req.body,
    po_number: poNumber,
    items,
    total_amount,
    ordered_by: req.user._id,
    ordered_at: new Date(),
    status: req.body.status || 'ordered',
    station_id: req.user.station_id,
  });
  success(res, order, 'Purchase order created', 201);
};

export const getOrder = async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, station_id: req.user.station_id })
    .populate('supplier_id')
    .populate('items.product_id');
  if (!order) throw new AppError('Purchase order not found', 404);
  success(res, order);
};

export const receiveOrder = async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!order) throw new AppError('Purchase order not found', 404);
  if (['received', 'cancelled'].includes(order.status)) {
    throw new AppError('Order cannot be received', 400);
  }

  const receivedItems = req.body.items || order.items;
  let receivedTotal = 0;
  order.items = order.items.map((item, idx) => {
    const received = receivedItems[idx]?.quantity_received ?? receivedItems.find(
      (r) => r.product_id?.toString() === item.product_id.toString()
    )?.quantity_received ?? item.quantity_ordered;
    item.quantity_received = received;
    item.subtotal = received * item.unit_price;
    receivedTotal += item.subtotal;
    return item;
  });

  const allReceived = order.items.every((i) => i.quantity_received >= i.quantity_ordered);
  order.status = allReceived ? 'received' : 'partial';
  order.total_amount = receivedTotal;
  order.received_by = req.user._id;
  order.received_at = new Date();
  await order.save();

  await receivePurchaseStock({
    stationId: req.user.station_id,
    items: order.items.map((i) => ({
      product_id: i.product_id,
      tank_id: i.tank_id,
      quantity_received: i.quantity_received,
      unit_price: i.unit_price,
    })),
    referenceId: order._id,
    userId: req.user._id,
  });

  await Supplier.findByIdAndUpdate(order.supplier_id, {
    $inc: { current_balance: receivedTotal },
  });

  await accounting.recordPurchaseReceived({
    stationId: req.user.station_id,
    userId: req.user._id,
    amount: receivedTotal,
    poNumber: order.po_number,
  });

  success(res, order, 'Purchase order received');
};

export const cancelOrder = async (req, res) => {
  const order = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id, status: { $nin: ['received'] } },
    { status: 'cancelled' },
    { new: true }
  );
  if (!order) throw new AppError('Order not found or cannot cancel', 404);
  success(res, order, 'Order cancelled');
};

export const listPayments = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { station_id: req.user.station_id, ...buildDateFilter(req.query, 'payment_date') };
  const [items, total] = await Promise.all([
    PurchasePayment.find(filter).populate('supplier_id', 'name').skip(skip).limit(limit).sort({ payment_date: -1 }),
    PurchasePayment.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const createPayment = async (req, res) => {
  const { supplier_id, amount, payment_method, reference_no, payment_date, purchase_order_id } = req.body;
  const supplier = await Supplier.findOne({ _id: supplier_id, station_id: req.user.station_id });
  if (!supplier) throw new AppError('Supplier not found', 404);
  if (amount > supplier.current_balance) {
    throw new AppError('Payment exceeds supplier balance', 400);
  }

  const payment = await PurchasePayment.create({
    supplier_id,
    amount,
    payment_method,
    reference_no,
    payment_date: payment_date || new Date(),
    purchase_order_id,
    recorded_by: req.user._id,
    station_id: req.user.station_id,
  });

  supplier.current_balance -= amount;
  await supplier.save();

  await accounting.recordSupplierPayment({
    stationId: req.user.station_id,
    userId: req.user._id,
    amount,
    referenceNo: reference_no || payment._id.toString(),
    method: payment_method,
  });

  success(res, payment, 'Payment recorded', 201);
};

export const listReturns = async (req, res) => {
  const items = await PurchaseReturn.find({ station_id: req.user.station_id })
    .populate('supplier_id', 'name')
    .sort({ createdAt: -1 });
  success(res, items);
};

export const createReturn = async (req, res) => {
  const returnNumber = await generateSequenceNumber(req.user.station_id, 'RETURN', 'RET');
  const items = req.body.items || [];
  const ret = await PurchaseReturn.create({
    ...req.body,
    return_number: returnNumber,
    items,
    status: 'pending',
    station_id: req.user.station_id,
  });
  success(res, ret, 'Return created', 201);
};

export const approveReturn = async (req, res) => {
  const ret = await PurchaseReturn.findOne({
    _id: req.params.id,
    station_id: req.user.station_id,
    status: 'pending',
  });
  if (!ret) throw new AppError('Return not found', 404);

  ret.status = 'approved';
  ret.approved_by = req.user._id;
  await ret.save();

  await returnPurchaseStock({
    stationId: req.user.station_id,
    items: ret.items,
    referenceId: ret._id,
    userId: req.user._id,
  });

  const total = ret.items.reduce((s, i) => s + i.subtotal, 0);
  await Supplier.findByIdAndUpdate(ret.supplier_id, { $inc: { current_balance: -total } });

  success(res, ret, 'Return approved');
};
