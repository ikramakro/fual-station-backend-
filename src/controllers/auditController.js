import AuditLog from '../models/AuditLog.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildDateFilter } from '../utils/pagination.js';

export const listAuditLogs = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...buildDateFilter(req.query, 'createdAt') };

  if (req.user.role !== 'super_admin') {
    filter.station_id = req.user.station_id;
  } else if (req.query.station_id) {
    filter.station_id = req.query.station_id;
  }

  if (req.query.module) filter.module = req.query.module;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.user_id) filter.user_id = req.query.user_id;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user_id', 'name email role')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    AuditLog.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};
