import Account from '../models/Account.js';
import Voucher from '../models/Voucher.js';
import Cheque from '../models/Cheque.js';
import Expense from '../models/Expense.js';
import Sale from '../models/Sale.js';
import PurchasePayment from '../models/PurchasePayment.js';
import SalePayment from '../models/SalePayment.js';
import { buildAccountTree, createVoucher, recordExpense } from '../services/accountingService.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildDateFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const getChartOfAccounts = async (req, res) => {
  const accounts = await Account.find({ station_id: req.user.station_id, is_active: true }).sort('code');
  success(res, buildAccountTree(accounts));
};

export const createAccount = async (req, res) => {
  const account = await Account.create({ ...req.body, station_id: req.user.station_id });
  success(res, account, 'Account created', 201);
};

export const updateAccount = async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!account) throw new AppError('Account not found', 404);
  if (account.is_system && req.body.is_active === false) {
    throw new AppError('System accounts cannot be deactivated', 400);
  }
  Object.assign(account, req.body);
  await account.save();
  success(res, account, 'Account updated');
};

export const listVouchers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { station_id: req.user.station_id, ...buildDateFilter(req.query, 'date') };
  const [items, total] = await Promise.all([
    Voucher.find(filter).skip(skip).limit(limit).sort({ date: -1 }),
    Voucher.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const createVoucherHandler = async (req, res) => {
  const voucher = await createVoucher({
    stationId: req.user.station_id,
    userId: req.user._id,
    voucherType: req.body.voucher_type,
    items: req.body.items,
    narration: req.body.narration,
    referenceNo: req.body.reference_no,
    date: req.body.date,
  });
  success(res, voucher, 'Voucher created', 201);
};

export const getVoucher = async (req, res) => {
  const voucher = await Voucher.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!voucher) throw new AppError('Voucher not found', 404);
  success(res, voucher);
};

export const listCheques = async (req, res) => {
  const cheques = await Cheque.find({ station_id: req.user.station_id }).sort({ due_date: 1 });
  success(res, cheques);
};

export const createCheque = async (req, res) => {
  const cheque = await Cheque.create({ ...req.body, station_id: req.user.station_id });
  success(res, cheque, 'Cheque created', 201);
};

export const updateChequeStatus = async (req, res) => {
  const cheque = await Cheque.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    { status: req.body.status, bounce_reason: req.body.bounce_reason },
    { new: true }
  );
  if (!cheque) throw new AppError('Cheque not found', 404);
  success(res, cheque, 'Cheque status updated');
};

export const listExpenses = async (req, res) => {
  const filter = { station_id: req.user.station_id, ...buildDateFilter(req.query, 'expense_date') };
  const expenses = await Expense.find(filter).populate('account_id', 'name code').sort({ expense_date: -1 });
  success(res, expenses);
};

export const createExpense = async (req, res) => {
  const expense = await Expense.create({
    ...req.body,
    recorded_by: req.user._id,
    station_id: req.user.station_id,
  });
  await recordExpense({
    stationId: req.user.station_id,
    userId: req.user._id,
    amount: expense.amount,
    accountId: expense.account_id,
    description: expense.description,
    method: expense.payment_method,
  });
  success(res, expense, 'Expense recorded', 201);
};

export const getDailyActivitySheet = async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const [sales, purchasePayments, customerPayments, expenses, vouchers] = await Promise.all([
    Sale.find({ station_id: req.user.station_id, createdAt: { $gte: start, $lte: end }, is_void: false }),
    PurchasePayment.find({ station_id: req.user.station_id, payment_date: { $gte: start, $lte: end } }),
    SalePayment.find({ station_id: req.user.station_id, payment_date: { $gte: start, $lte: end } }),
    Expense.find({ station_id: req.user.station_id, expense_date: { $gte: start, $lte: end } }),
    Voucher.find({ station_id: req.user.station_id, date: { $gte: start, $lte: end } }),
  ]);

  const cashIn =
    sales.filter((s) => s.payment_method === 'cash').reduce((a, s) => a + s.total_amount, 0) +
    customerPayments.filter((p) => p.payment_method === 'cash').reduce((a, p) => a + p.amount, 0);
  const cashOut =
    purchasePayments.filter((p) => p.payment_method === 'cash').reduce((a, p) => a + p.amount, 0) +
    expenses.filter((e) => e.payment_method === 'cash').reduce((a, e) => a + e.amount, 0);

  success(res, {
    date: dateStr,
    sales,
    purchasePayments,
    customerPayments,
    expenses,
    vouchers,
    summary: { cashIn, cashOut, netCash: cashIn - cashOut },
  });
};
