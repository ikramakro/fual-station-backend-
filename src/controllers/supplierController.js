import Supplier from '../models/Supplier.js';
import PurchasePayment from '../models/PurchasePayment.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listSuppliers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    station_id: req.user.station_id,
    is_active: req.query.includeInactive !== 'true',
    ...buildSearchFilter(req.query.search, ['name', 'phone', 'email']),
  };
  if (filter.is_active === false) delete filter.is_active;
  const [items, total] = await Promise.all([
    Supplier.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Supplier.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const getSupplier = async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!supplier) throw new AppError('Supplier not found', 404);
  success(res, supplier);
};

export const createSupplier = async (req, res) => {
  const supplier = await Supplier.create({ ...req.body, station_id: req.user.station_id });
  success(res, supplier, 'Supplier created', 201);
};

export const updateSupplier = async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!supplier) throw new AppError('Supplier not found', 404);
  success(res, supplier, 'Supplier updated');
};

export const deleteSupplier = async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    { is_active: false },
    { new: true }
  );
  if (!supplier) throw new AppError('Supplier not found', 404);
  success(res, supplier, 'Supplier deactivated');
};

export const getSupplierBalance = async (req, res) => {
  const supplier = await Supplier.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!supplier) throw new AppError('Supplier not found', 404);
  const [payments, orders] = await Promise.all([
    PurchasePayment.find({ supplier_id: supplier._id }).sort({ payment_date: -1 }).limit(50),
    PurchaseOrder.find({ supplier_id: supplier._id, status: { $in: ['received', 'partial'] } })
      .sort({ received_at: -1 })
      .limit(50),
  ]);
  success(res, { supplier, payments, orders });
};
