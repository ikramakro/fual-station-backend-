import AuditLog from '../models/AuditLog.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const auditMiddleware = (module, action, tableName) => {
  return async (req, res, next) => {
    if (!MUTATION_METHODS.has(req.method)) {
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        AuditLog.create({
          user_id: req.user?._id,
          station_id: req.user?.station_id,
          module,
          action: action || `${req.method.toLowerCase()}_${module}`,
          table_name: tableName,
          record_id: body?.data?._id || req.params?.id,
          before_value: req.auditBefore || null,
          after_value: body?.data || req.body,
          ip_address: req.ip || req.headers['x-forwarded-for'],
          device_info: req.headers['user-agent'],
        }).catch((err) => console.error('Audit log error:', err.message));
      }
      return originalJson(body);
    };
    next();
  };
};
