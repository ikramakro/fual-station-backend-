import Station from '../models/Station.js';
import LowFuelAlert from '../models/LowFuelAlert.js';
import Tank from '../models/Tank.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listStations = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { is_active: req.query.includeInactive !== 'true' };
  if (filter.is_active === false) delete filter.is_active;
  const [items, total] = await Promise.all([
    Station.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Station.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const createStation = async (req, res) => {
  const station = await Station.create(req.body);
  success(res, station, 'Station created', 201);
};

export const getStation = async (req, res) => {
  const stationId = req.user.role === 'super_admin' && req.query.station_id
    ? req.query.station_id
    : req.user.station_id;
  const station = await Station.findById(stationId);
  if (!station) throw new AppError('Station not found', 404);
  success(res, station);
};

export const updateStation = async (req, res) => {
  const stationId = req.user.role === 'super_admin' && req.body.station_id
    ? req.body.station_id
    : req.user.station_id;
  const { station_id, ...updates } = req.body;
  const station = await Station.findByIdAndUpdate(stationId, updates, {
    new: true,
    runValidators: true,
  });
  if (!station) throw new AppError('Station not found', 404);
  success(res, station, 'Station updated');
};

export const getAlertSettings = async (req, res) => {
  const station = await Station.findById(req.user.station_id);
  if (!station) throw new AppError('Station not found', 404);
  success(res, {
    low_fuel_alert_threshold_pct: station.low_fuel_alert_threshold_pct,
    alert_channels: station.alert_channels,
  });
};

export const updateAlertSettings = async (req, res) => {
  const { low_fuel_alert_threshold_pct, alert_channels } = req.body;
  const station = await Station.findByIdAndUpdate(
    req.user.station_id,
    { low_fuel_alert_threshold_pct, alert_channels },
    { new: true, runValidators: true }
  );
  success(res, {
    low_fuel_alert_threshold_pct: station.low_fuel_alert_threshold_pct,
    alert_channels: station.alert_channels,
  }, 'Alert settings updated');
};

export const listLowFuelAlerts = async (req, res) => {
  const filter = { station_id: req.user.station_id };
  if (req.query.status) filter.status = req.query.status;
  const alerts = await LowFuelAlert.find(filter)
    .populate('tank_id', 'name code fuel_type')
    .sort({ createdAt: -1 })
    .limit(50);
  success(res, alerts);
};

export const resolveLowFuelAlert = async (req, res) => {
  const alert = await LowFuelAlert.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id, status: 'active' },
    { status: 'resolved', resolved_at: new Date(), resolved_by: req.user._id },
    { new: true }
  );
  if (!alert) throw new AppError('Alert not found or already resolved', 404);
  success(res, alert, 'Alert resolved');
};

export const checkLowFuelAlerts = async (req, res) => {
  const station = await Station.findById(req.user.station_id);
  const tanks = await Tank.find({ station_id: req.user.station_id, is_active: true });
  const thresholdPct = station.low_fuel_alert_threshold_pct || 20;
  const alerts = [];

  for (const tank of tanks) {
    const percentage = tank.capacity_liters
      ? (tank.current_stock_liters / tank.capacity_liters) * 100
      : 0;
    if (percentage <= thresholdPct) {
      const existing = await LowFuelAlert.findOne({
        tank_id: tank._id,
        station_id: req.user.station_id,
        status: 'active',
      });
      if (!existing) {
        const alert = await LowFuelAlert.create({
          tank_id: tank._id,
          station_id: req.user.station_id,
          current_stock_liters: tank.current_stock_liters,
          capacity_liters: tank.capacity_liters,
          threshold_pct: thresholdPct,
          percentage: Math.round(percentage),
          channels_notified: station.alert_channels || ['in_app'],
        });
        alerts.push(alert);
      } else {
        alerts.push(existing);
      }
    }
  }
  success(res, alerts);
};
