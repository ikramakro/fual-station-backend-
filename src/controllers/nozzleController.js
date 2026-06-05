import Nozzle from '../models/Nozzle.js';
import NozzleReading from '../models/NozzleReading.js';
import Shift from '../models/Shift.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listNozzles = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { station_id: req.user.station_id, is_active: true };
  const [items, total] = await Promise.all([
    Nozzle.find(filter).populate('tank_id').skip(skip).limit(limit),
    Nozzle.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const getNozzle = async (req, res) => {
  const nozzle = await Nozzle.findOne({ _id: req.params.id, station_id: req.user.station_id }).populate('tank_id');
  if (!nozzle) throw new AppError('Nozzle not found', 404);
  success(res, nozzle);
};

export const createNozzle = async (req, res) => {
  const nozzle = await Nozzle.create({ ...req.body, station_id: req.user.station_id });
  success(res, nozzle, 'Nozzle created', 201);
};

export const updateNozzle = async (req, res) => {
  const nozzle = await Nozzle.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!nozzle) throw new AppError('Nozzle not found', 404);
  success(res, nozzle, 'Nozzle updated');
};

export const deleteNozzle = async (req, res) => {
  const nozzle = await Nozzle.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    { is_active: false },
    { new: true }
  );
  if (!nozzle) throw new AppError('Nozzle not found', 404);
  success(res, nozzle, 'Nozzle deactivated');
};

export const listNozzleReadings = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { station_id: req.user.station_id, nozzle_id: req.params.id };
  if (req.query.shift_id) filter.shift_id = req.query.shift_id;
  const [items, total] = await Promise.all([
    NozzleReading.find(filter)
      .populate('shift_id', 'shift_name status')
      .populate('recorded_by', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    NozzleReading.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const recordNozzleReading = async (req, res) => {
  const shift = await Shift.findOne({ station_id: req.user.station_id, status: 'open' });
  if (!shift) throw new AppError('No open shift', 400);

  const reading = await NozzleReading.create({
    ...req.body,
    nozzle_id: req.params.id,
    shift_id: shift._id,
    recorded_by: req.user._id,
    station_id: req.user.station_id,
  });
  success(res, reading, 'Nozzle reading recorded', 201);
};
