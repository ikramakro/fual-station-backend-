import DipCalibrationChart from '../models/DipCalibrationChart.js';
import StockLedger from '../models/StockLedger.js';
import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Account from '../models/Account.js';
import Voucher from '../models/Voucher.js';
import GainLossVoucher from '../models/GainLossVoucher.js';

export function interpolateLitersFromChart(entries, mm) {
  if (!entries?.length) return 0;
  const sorted = [...entries].sort((a, b) => a.mm - b.mm);
  if (mm <= sorted[0].mm) return sorted[0].liters;
  if (mm >= sorted[sorted.length - 1].mm) return sorted[sorted.length - 1].liters;

  for (let i = 0; i < sorted.length - 1; i++) {
    const low = sorted[i];
    const high = sorted[i + 1];
    if (mm >= low.mm && mm <= high.mm) {
      const ratio = (mm - low.mm) / (high.mm - low.mm);
      return low.liters + ratio * (high.liters - low.liters);
    }
  }
  return 0;
}

export async function calculateBookStock(tankId, periodStart, periodEnd) {
  const openingEntry = await StockLedger.findOne({ tank_id: tankId }).sort({ createdAt: 1 });
  const openingStock = openingEntry?.balance_after || 0;

  const movements = await StockLedger.aggregate([
    {
      $match: {
        tank_id: tankId,
        createdAt: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: null,
        purchases: { $sum: '$quantity_in' },
        sales: { $sum: '$quantity_out' },
      },
    },
  ]);

  const purchases = movements[0]?.purchases || 0;
  const sales = movements[0]?.sales || 0;
  return openingStock + purchases - sales;
}

export async function getCustomerAgingReport(stationId) {
  const customers = await Customer.find({
    station_id: stationId,
    is_active: true,
    current_balance: { $gt: 0 },
  });

  const now = new Date();
  const results = [];

  for (const customer of customers) {
    const creditSales = await Sale.find({
      station_id: stationId,
      customer_id: customer._id,
      payment_method: 'credit',
      is_void: false,
    }).sort({ createdAt: -1 });

    const buckets = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 };

    for (const sale of creditSales) {
      const days = Math.floor((now - sale.createdAt) / (1000 * 60 * 60 * 24));
      const amount = sale.total_amount;
      if (days <= 0) buckets.current += amount;
      else if (days <= 30) buckets.days_1_30 += amount;
      else if (days <= 60) buckets.days_31_60 += amount;
      else if (days <= 90) buckets.days_61_90 += amount;
      else buckets.days_90_plus += amount;
    }

    results.push({
      customer_id: customer._id,
      customer_name: customer.name,
      phone: customer.phone,
      total_balance: customer.current_balance,
      ...buckets,
    });
  }

  return results;
}

export async function getTrialBalance(stationId, from, to) {
  const accounts = await Account.find({ station_id: stationId, is_active: true }).sort('code');
  return accounts.map((acc) => ({
    code: acc.code,
    name: acc.name,
    account_type: acc.account_type,
    debit: acc.current_balance > 0 && ['asset', 'expense'].includes(acc.account_type) ? acc.current_balance : 0,
    credit: acc.current_balance > 0 && ['liability', 'equity', 'income'].includes(acc.account_type) ? acc.current_balance : 0,
  }));
}

export async function getProfitLoss(stationId, from, to) {
  const income = await Account.find({ station_id: stationId, account_type: 'income', is_active: true });
  const expenses = await Account.find({ station_id: stationId, account_type: 'expense', is_active: true });
  const totalIncome = income.reduce((s, a) => s + a.current_balance, 0);
  const totalExpense = expenses.reduce((s, a) => s + a.current_balance, 0);
  return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, income, expenses };
}

export async function getBalanceSheet(stationId, date) {
  const assets = await Account.find({ station_id: stationId, account_type: 'asset', is_active: true });
  const liabilities = await Account.find({ station_id: stationId, account_type: 'liability', is_active: true });
  const equity = await Account.find({ station_id: stationId, account_type: 'equity', is_active: true });
  return { assets, liabilities, equity, asOf: date };
}

export async function getPayableReceivable(stationId) {
  const suppliers = await Supplier.find({ station_id: stationId, is_active: true, current_balance: { $gt: 0 } });
  const customers = await Customer.find({ station_id: stationId, is_active: true, current_balance: { $gt: 0 } });
  return {
    payables: suppliers.map((s) => ({ id: s._id, name: s.name, balance: s.current_balance })),
    receivables: customers.map((c) => ({ id: c._id, name: c.name, balance: c.current_balance })),
    totalPayable: suppliers.reduce((s, x) => s + x.current_balance, 0),
    totalReceivable: customers.reduce((s, x) => s + x.current_balance, 0),
  };
}

export async function getSalesSummary(stationId, from, to, type) {
  const match = { station_id: stationId, is_void: false };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      match.createdAt.$lte = t;
    }
  }
  if (type) match.sale_type = type;

  return Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: { sale_type: '$sale_type', payment_method: '$payment_method' },
        count: { $sum: 1 },
        total: { $sum: '$total_amount' },
        liters: { $sum: { $sum: '$items.quantity' } },
      },
    },
  ]);
}

export async function getPurchaseSummary(stationId, from, to) {
  const match = { station_id: stationId, status: { $in: ['received', 'partial'] } };
  if (from || to) {
    match.received_at = {};
    if (from) match.received_at.$gte = new Date(from);
    if (to) match.received_at.$lte = new Date(to);
  }
  const PurchaseOrder = (await import('../models/PurchaseOrder.js')).default;
  return PurchaseOrder.aggregate([
    { $match: match },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total_amount' } } },
  ]);
}

export async function getGainLossReport(stationId, tankId, from, to) {
  const filter = { station_id: stationId };
  if (tankId) filter.tank_id = tankId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  return GainLossVoucher.find(filter).populate('tank_id', 'name fuel_type').sort({ createdAt: -1 });
}

export async function getStockLedgerReport(stationId, productId, from, to) {
  const filter = { station_id: stationId };
  if (productId) filter.product_id = productId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  return StockLedger.find(filter).populate('product_id', 'name').sort({ createdAt: -1 });
}

export async function getCalibrationChart(tankId) {
  return DipCalibrationChart.findOne({ tank_id: tankId });
}
