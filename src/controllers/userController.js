import User from '../models/User.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listUsers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { station_id: req.user.station_id, ...buildSearchFilter(req.query.search, ['name', 'email']) };
  const [items, total] = await Promise.all([
    User.find(filter).select('-password -pin').skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const getUser = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, station_id: req.user.station_id }).select('-password -pin');
  if (!user) throw new AppError('User not found', 404);
  success(res, user);
};

export const createUser = async (req, res) => {
  const data = { ...req.body, station_id: req.user.station_id };
  const user = await User.create(data);
  const profile = await User.findById(user._id).select('-password -pin');
  success(res, profile, 'User created', 201);
};

export const updateUser = async (req, res) => {
  const { password, pin, ...updates } = req.body;
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    updates,
    { new: true, runValidators: true }
  ).select('-password -pin');
  if (!user) throw new AppError('User not found', 404);
  success(res, user, 'User updated');
};

export const deleteUser = async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    { is_active: false },
    { new: true }
  ).select('-password -pin');
  if (!user) throw new AppError('User not found', 404);
  success(res, user, 'User deactivated');
};

export const setPin = async (req, res) => {
  const { pin } = req.body;
  if (!/^\d{4}$/.test(pin)) throw new AppError('PIN must be 4 digits', 400);

  const isSelf = req.params.id === req.user._id.toString();
  const canManage = ['owner', 'manager', 'super_admin'].includes(req.user.role);
  if (!isSelf && !canManage) throw new AppError('Insufficient permissions', 403);

  const filter = { _id: req.params.id };
  if (req.user.role !== 'super_admin') filter.station_id = req.user.station_id;

  const user = await User.findOne(filter);
  if (!user) throw new AppError('User not found', 404);
  user.pin = pin;
  await user.save();
  success(res, null, 'PIN updated');
};
