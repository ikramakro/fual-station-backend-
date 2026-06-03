import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    profile_photo: { type: String },
    password: { type: String, required: true, select: false },
    pin: { type: String, select: false },
    role: { type: String, enum: ROLES, required: true },
    station_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
    is_active: { type: Boolean, default: true },
    last_login: { type: Date },
    failed_login_attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashSecrets(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, env.bcryptRounds);
  }
  if (this.isModified('pin') && this.pin) {
    if (!/^\d{4}$/.test(this.pin)) {
      return next(new Error('PIN must be exactly 4 digits'));
    }
    this.pin = await bcrypt.hash(this.pin, env.bcryptRounds);
  }
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.comparePin = function (candidate) {
  if (!this.pin) return false;
  return bcrypt.compare(candidate, this.pin);
};

export default mongoose.model('User', userSchema);
