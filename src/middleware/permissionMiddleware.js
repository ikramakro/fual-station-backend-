import { hasPermission } from '../utils/permissions.js';

export const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    }
    if (!hasPermission(req.user.role, module, action)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions', errors: [] });
    }
    next();
  };
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super admin access required', errors: [] });
  }
  next();
};
