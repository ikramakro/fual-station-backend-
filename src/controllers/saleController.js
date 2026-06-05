import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Shift from '../models/Shift.js';
import User from '../models/User.js';
import { generateSequenceNumber } from '../utils/sequenceGenerator.js';
import { deductSaleStock, reverseSaleStock } from '../services/stockService.js';
import * as accounting from '../services/accountingService.js';
import { emitNewSale } from '../services/socketService.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildDateFilter, buildSearchFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listSales = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    station_id: req.user.station_id,
    ...buildDateFilter(req.query, 'createdAt'),
  };
  if (req.query.sale_type) filter.sale_type = req.query.sale_type;
  if (req.query.customer_id) filter.customer_id = req.query.customer_id;
  if (req.query.shift_id) filter.shift_id = req.query.shift_id;
  if (req.query.cashier_id) filter.cashier_id = req.query.cashier_id;
  if (req.query.search) Object.assign(filter, buildSearchFilter(req.query.search, ['sale_number']));

  const [items, total] = await Promise.all([
    Sale.find(filter)
      .populate('customer_id', 'name phone')
      .populate('cashier_id', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Sale.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const createSale = async (req, res) => {
  const shift = await Shift.findOne({ station_id: req.user.station_id, status: 'open' });
  if (!shift) throw new AppError('No open shift. Open a shift first.', 400);

  const items = req.body.items || [];
  const subtotal = items.reduce((s, i) => s + (i.subtotal || i.quantity * i.unit_price), 0);
  const discount = req.body.discount || 0;
  const total_amount = subtotal - discount;

  if (req.body.payment_method === 'credit' && req.body.customer_id) {
    const customer = await Customer.findById(req.body.customer_id);
    if (!customer) throw new AppError('Customer not found', 404);
    if (customer.current_balance + total_amount > customer.credit_limit) {
      throw new AppError('Credit limit exceeded', 400);
    }
  }

  const saleNumber = await generateSequenceNumber(req.user.station_id, 'SALE', 'SALE');
  const amount_paid = req.body.amount_paid ?? total_amount;
  const change_given = Math.max(0, amount_paid - total_amount);

  const sale = await Sale.create({
    ...req.body,
    sale_number: saleNumber,
    items,
    subtotal,
    discount,
    total_amount,
    amount_paid,
    change_given,
    shift_id: shift._id,
    cashier_id: req.user._id,
    station_id: req.user.station_id,
  });

  await deductSaleStock({
    stationId: req.user.station_id,
    items,
    referenceId: sale._id,
    userId: req.user._id,
  });

  if (req.body.payment_method === 'credit' && req.body.customer_id) {
    await Customer.findByIdAndUpdate(req.body.customer_id, { $inc: { current_balance: total_amount } });
    await accounting.recordCreditSale({
      stationId: req.user.station_id,
      userId: req.user._id,
      amount: total_amount,
      saleNumber,
    });
  } else if (['cash', 'card', 'mobile'].includes(req.body.payment_method)) {
    await accounting.recordCashSale({
      stationId: req.user.station_id,
      userId: req.user._id,
      amount: total_amount,
      saleNumber,
    });
  }

  emitNewSale(req.user.station_id, sale, req.user.name);

  success(res, sale, 'Sale created', 201);
};

export const getSale = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, station_id: req.user.station_id })
    .populate('customer_id vehicle_id nozzle_id cashier_id shift_id')
    .populate('items.product_id');
  if (!sale) throw new AppError('Sale not found', 404);
  success(res, sale);
};

export const voidSale = async (req, res) => {
  const sale = await Sale.findOne({
    _id: req.params.id,
    station_id: req.user.station_id,
    is_void: false,
  });
  if (!sale) throw new AppError('Sale not found or already voided', 404);

  sale.is_void = true;
  sale.voided_by = req.user._id;
  sale.void_reason = req.body.void_reason || 'Voided by manager';
  await sale.save();

  await reverseSaleStock({
    stationId: req.user.station_id,
    items: sale.items,
    referenceId: sale._id,
    userId: req.user._id,
  });

  if (sale.payment_method === 'credit' && sale.customer_id) {
    await Customer.findByIdAndUpdate(sale.customer_id, { $inc: { current_balance: -sale.total_amount } });
  }

  success(res, sale, 'Sale voided');
};

export const syncOfflineSales = async (req, res) => {
  const sales = req.body.sales || [];
  if (!Array.isArray(sales) || sales.length === 0) {
    throw new AppError('Sales array required', 400);
  }

  const shift = await Shift.findOne({ station_id: req.user.station_id, status: 'open' });
  if (!shift) throw new AppError('No open shift. Open a shift first.', 400);

  const results = { synced: [], skipped: [], failed: [] };

  for (const saleData of sales) {
    try {
      if (!saleData.offline_id) {
        results.failed.push({ offline_id: null, error: 'offline_id required' });
        continue;
      }

      const existing = await Sale.findOne({
        station_id: req.user.station_id,
        offline_id: saleData.offline_id,
      });
      if (existing) {
        results.skipped.push({ offline_id: saleData.offline_id, sale_id: existing._id });
        continue;
      }

      const items = saleData.items || [];
      const subtotal = items.reduce((s, i) => s + (i.subtotal || i.quantity * i.unit_price), 0);
      const discount = saleData.discount || 0;
      const total_amount = subtotal - discount;

      if (saleData.payment_method === 'credit' && saleData.customer_id) {
        const customer = await Customer.findById(saleData.customer_id);
        if (!customer) throw new AppError('Customer not found', 404);
        if (customer.current_balance + total_amount > customer.credit_limit) {
          throw new AppError('Credit limit exceeded', 400);
        }
      }

      const saleNumber = await generateSequenceNumber(req.user.station_id, 'SALE', 'SALE');
      const amount_paid = saleData.amount_paid ?? total_amount;
      const change_given = Math.max(0, amount_paid - total_amount);

      const sale = await Sale.create({
        ...saleData,
        sale_number: saleNumber,
        items,
        subtotal,
        discount,
        total_amount,
        amount_paid,
        change_given,
        shift_id: shift._id,
        cashier_id: req.user._id,
        station_id: req.user.station_id,
        is_offline: true,
        synced_at: new Date(),
        createdAt: saleData.created_at || new Date(),
      });

      await deductSaleStock({
        stationId: req.user.station_id,
        items,
        referenceId: sale._id,
        userId: req.user._id,
      });

      if (saleData.payment_method === 'credit' && saleData.customer_id) {
        await Customer.findByIdAndUpdate(saleData.customer_id, { $inc: { current_balance: total_amount } });
        await accounting.recordCreditSale({
          stationId: req.user.station_id,
          userId: req.user._id,
          amount: total_amount,
          saleNumber,
        });
      } else if (['cash', 'card', 'mobile'].includes(saleData.payment_method)) {
        await accounting.recordCashSale({
          stationId: req.user.station_id,
          userId: req.user._id,
          amount: total_amount,
          saleNumber,
        });
      }

      results.synced.push({ offline_id: saleData.offline_id, sale_id: sale._id, sale_number: saleNumber });
    } catch (err) {
      results.failed.push({ offline_id: saleData.offline_id, error: err.message });
    }
  }

  success(res, results, 'Offline sales sync completed');
};
