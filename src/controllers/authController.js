import User from '../models/User.js';
import { signToken, storeSession, invalidateSession } from '../middleware/authMiddleware.js';
import { success } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password required', 400);

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.is_active) throw new AppError('Invalid credentials', 401);

  const valid = await user.comparePassword(password);
  if (!valid) {
    user.failed_login_attempts += 1;
    await user.save();
    throw new AppError('Invalid credentials', 401);
  }

  user.failed_login_attempts = 0;
  user.last_login = new Date();
  await user.save();

  const token = signToken(user._id, user.station_id, user.role);
  await storeSession(token, user._id.toString());

  const profile = await User.findById(user._id).select('-password -pin');
  success(res, { token, user: profile }, 'Login successful');
};

export const pinLogin = async (req, res) => {
  const { pin, station_id } = req.body;
  if (!pin || !station_id) throw new AppError('PIN and station_id required', 400);
  if (!/^\d{4}$/.test(pin)) throw new AppError('PIN must be 4 digits', 400);

  const users = await User.find({ station_id, is_active: true }).select('+pin');
  let matched = null;
  for (const user of users) {
    if (user.pin && (await user.comparePin(pin))) {
      matched = user;
      break;
    }
  }

  if (!matched) throw new AppError('Invalid PIN', 401);

  matched.last_login = new Date();
  await matched.save();

  const token = signToken(matched._id, matched.station_id, matched.role);
  await storeSession(token, matched._id.toString());

  const profile = await User.findById(matched._id).select('-password -pin');
  success(res, { token, user: profile }, 'PIN login successful');
};

export const logout = async (req, res) => {
  if (req.token) await invalidateSession(req.token);
  success(res, null, 'Logged out');
};

export const me = async (req, res) => {
  success(res, req.user);
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw new AppError('Current password is incorrect', 400);
  user.password = newPassword;
  await user.save();
  success(res, null, 'Password updated');
};
