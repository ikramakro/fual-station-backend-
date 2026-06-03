import { ROLE_HIERARCHY } from '../utils/constants.js';

export const rbac = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    }

    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const minRequired = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r] || 0));

    const hasDirectRole = allowedRoles.includes(userRole);
    const hasHigherRole = userLevel >= minRequired;

    if (!hasDirectRole && !hasHigherRole) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions', errors: [] });
    }

    next();
  };
};

export const minRole = (minimumRole) => {
  return (req, res, next) => {
    const userLevel = ROLE_HIERARCHY[req.user?.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions', errors: [] });
    }
    next();
  };
};
