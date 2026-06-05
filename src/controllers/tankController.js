import Tank from '../models/Tank.js';
import { getTankStockHistory, transferStock as doTransferStock } from '../services/stockService.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listTanks = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    station_id: req.user.station_id,
    is_active: req.query.includeInactive !== 'true',
    ...buildSearchFilter(req.query.search, ['name', 'code']),
  };
  if (filter.is_active === false) delete filter.is_active;
  const [items, total] = await Promise.all([
    Tank.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Tank.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const getTank = async (req, res) => {
  const tank = await Tank.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!tank) throw new AppError('Tank not found', 404);
  success(res, tank);
};

export const createTank = async (req, res) => {
  const tank = await Tank.create({ ...req.body, station_id: req.user.station_id });
  success(res, tank, 'Tank created', 201);
};

export const updateTank = async (req, res) => {
  const tank = await Tank.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!tank) throw new AppError('Tank not found', 404);
  success(res, tank, 'Tank updated');
};

export const deleteTank = async (req, res) => {
  const tank = await Tank.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    { is_active: false },
    { new: true }
  );
  if (!tank) throw new AppError('Tank not found', 404);
  success(res, tank, 'Tank deactivated');
};

export const getTankStock = async (req, res) => {
  const tank = await Tank.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!tank) throw new AppError('Tank not found', 404);
  const movements = await getTankStockHistory(tank._id);
  const percentage = tank.capacity_liters
    ? Math.round((tank.current_stock_liters / tank.capacity_liters) * 100)
    : 0;
  success(res, { tank, percentage, movements });
};

export const transferStock = async (req, res) => {
  const { from_tank_id, to_tank_id, product_id, quantity } = req.body;
  const fromTank = await Tank.findOne({ _id: from_tank_id, station_id: req.user.station_id });
  const toTank = await Tank.findOne({ _id: to_tank_id, station_id: req.user.station_id });
  if (!fromTank || !toTank) throw new AppError('Tank not found', 404);
  if (fromTank.fuel_type !== toTank.fuel_type) {
    throw new AppError('Tanks must have the same fuel type for transfer', 400);
  }

  const result = await doTransferStock({
    stationId: req.user.station_id,
    fromTankId: from_tank_id,
    toTankId: to_tank_id,
    productId: product_id,
    quantity,
    referenceId: from_tank_id,
    userId: req.user._id,
  });
  success(res, result, 'Stock transferred');
};
