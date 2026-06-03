import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getRedis, SESSION_PREFIX } from '../config/redis.js';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    }

    const redis = getRedis();
    const sessionKey = `${SESSION_PREFIX}${token}`;
    const sessionValid = await redis.get(sessionKey).catch(() => '1');

    if (sessionValid === 'invalid') {
      return res.status(401).json({ success: false, message: 'Session expired', errors: [] });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.userId).select('-password -pin');

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid user', errors: [] });
    }

    req.user = user;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', errors: [] });
  }
};

export const signToken = (userId, stationId, role) => {
  return jwt.sign({ userId, stationId, role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

export const storeSession = async (token, userId) => {
  const redis = getRedis();
  const ttl = 7 * 24 * 60 * 60;
  await redis.set(`${SESSION_PREFIX}${token}`, userId, 'EX', ttl);
};

export const invalidateSession = async (token) => {
  const redis = getRedis();
  await redis.set(`${SESSION_PREFIX}${token}`, 'invalid', 'EX', 86400);
};
