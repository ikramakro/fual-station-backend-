import Shift from '../models/Shift.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const getCurrentShift = async (req, res) => {
  const shift = await Shift.findOne({ station_id: req.user.station_id, status: 'open' })
    .populate('opened_by', 'name role');
  success(res, shift);
};

export const openShift = async (req, res) => {
  const existing = await Shift.findOne({ station_id: req.user.station_id, status: 'open' });
  if (existing) throw new AppError('A shift is already open', 400);

  const shift = await Shift.create({
    ...req.body,
    station_id: req.user.station_id,
    opened_by: req.user._id,
    status: 'open',
    opened_at: new Date(),
  });
  success(res, shift, 'Shift opened', 201);
};

export const closeShift = async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.id, station_id: req.user.station_id, status: 'open' });
  if (!shift) throw new AppError('Open shift not found', 404);

  const salesAgg = await Sale.aggregate([
    { $match: { shift_id: shift._id, is_void: false } },
    { $group: { _id: null, total: { $sum: '$total_amount' } } },
  ]);
  const expenseAgg = await Expense.aggregate([
    { $match: { shift_id: shift._id } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  shift.total_sales = salesAgg[0]?.total || 0;
  shift.total_expenses = expenseAgg[0]?.total || 0;
  shift.closing_cash = req.body.closing_cash ?? 0;
  shift.net_cash = shift.closing_cash - shift.opening_cash + shift.total_sales - shift.total_expenses;
  shift.status = 'closed';
  shift.closed_by = req.user._id;
  shift.closed_at = new Date();
  await shift.save();

  success(res, shift, 'Shift closed');
};

export const getShift = async (req, res) => {
  const shift = await Shift.findOne({ _id: req.params.id, station_id: req.user.station_id })
    .populate('opened_by closed_by approved_by', 'name');
  if (!shift) throw new AppError('Shift not found', 404);
  const sales = await Sale.find({ shift_id: shift._id }).sort({ createdAt: -1 }).limit(100);
  success(res, { shift, sales });
};

export const approveShift = async (req, res) => {
  const shift = await Shift.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id, status: 'closed' },
    { manager_approved: true, approved_by: req.user._id },
    { new: true }
  );
  if (!shift) throw new AppError('Shift not found', 404);
  success(res, shift, 'Shift approved');
};

export const listShifts = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { station_id: req.user.station_id };
  const [items, total] = await Promise.all([
    Shift.find(filter).populate('opened_by', 'name').skip(skip).limit(limit).sort({ opened_at: -1 }),
    Shift.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};
