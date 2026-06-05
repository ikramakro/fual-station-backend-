import DipReading from '../models/DipReading.js';
import DipCalibrationChart from '../models/DipCalibrationChart.js';
import GainLossVoucher from '../models/GainLossVoucher.js';
import Shift from '../models/Shift.js';
import Tank from '../models/Tank.js';
import Product from '../models/Product.js';
import {
  interpolateLitersFromChart,
  calculateBookStock,
  getCalibrationChart,
} from '../services/reportService.js';
import { recordGainLossStock } from '../services/stockService.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildDateFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const createDipReading = async (req, res) => {
  const { tank_id, reading_mm, temperature, density, reading_date } = req.body;
  const chart = await getCalibrationChart(tank_id);
  const calculated_liters = chart
    ? interpolateLitersFromChart(chart.entries, reading_mm)
    : req.body.calculated_liters || 0;

  const shift = await Shift.findOne({ station_id: req.user.station_id, status: 'open' });

  const reading = await DipReading.create({
    tank_id,
    reading_mm,
    calculated_liters,
    temperature,
    density,
    reading_date: reading_date || new Date(),
    shift_id: shift?._id,
    recorded_by: req.user._id,
    station_id: req.user.station_id,
  });

  success(res, reading, 'Dip reading recorded', 201);
};

export const listDipReadings = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    station_id: req.user.station_id,
    ...buildDateFilter(req.query, 'reading_date'),
  };
  if (req.query.tank_id) filter.tank_id = req.query.tank_id;
  const [items, total] = await Promise.all([
    DipReading.find(filter).populate('tank_id', 'name').skip(skip).limit(limit).sort({ reading_date: -1 }),
    DipReading.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const getCalibration = async (req, res) => {
  const chart = await DipCalibrationChart.findOne({
    tank_id: req.params.tankId,
    station_id: req.user.station_id,
  });
  success(res, chart || { entries: [] });
};

export const updateCalibration = async (req, res) => {
  const chart = await DipCalibrationChart.findOneAndUpdate(
    { tank_id: req.params.tankId, station_id: req.user.station_id },
    { entries: req.body.entries, tank_id: req.params.tankId, station_id: req.user.station_id },
    { upsert: true, new: true, runValidators: true }
  );
  success(res, chart, 'Calibration chart updated');
};

export const createGainLoss = async (req, res) => {
  const { tank_id, physical_stock, shift_id, reason } = req.body;
  const tank = await Tank.findOne({ _id: tank_id, station_id: req.user.station_id });
  if (!tank) throw new AppError('Tank not found', 404);

  const periodStart = new Date();
  periodStart.setHours(0, 0, 0, 0);
  const book_stock = await calculateBookStock(tank_id, periodStart, new Date());
  const difference = physical_stock - book_stock;
  const type = difference >= 0 ? 'gain' : 'loss';
  const absDifference = Math.abs(difference);

  const voucher = await GainLossVoucher.create({
    tank_id,
    shift_id,
    book_stock,
    physical_stock,
    difference,
    type,
    reason,
    approved_by: req.user._id,
    station_id: req.user.station_id,
  });

  if (absDifference > 0) {
    const product = await Product.findOne({
      station_id: req.user.station_id,
      is_fuel: true,
      is_active: true,
      name: new RegExp(tank.fuel_type, 'i'),
    });
    await recordGainLossStock({
      stationId: req.user.station_id,
      tankId: tank_id,
      productId: product?._id,
      type,
      quantity: absDifference,
      referenceId: voucher._id,
      userId: req.user._id,
    });
  }

  success(res, voucher, 'Gain/loss voucher created', 201);
};

export const listGainLoss = async (req, res) => {
  const filter = { station_id: req.user.station_id };
  if (req.query.tank_id) filter.tank_id = req.query.tank_id;
  const items = await GainLossVoucher.find(filter).populate('tank_id', 'name').sort({ createdAt: -1 });
  success(res, items);
};
