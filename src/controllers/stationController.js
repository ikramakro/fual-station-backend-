import Station from '../models/Station.js';
import { success } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

export const getStation = async (req, res) => {
  const station = await Station.findById(req.user.station_id);
  if (!station) throw new AppError('Station not found', 404);
  success(res, station);
};

export const updateStation = async (req, res) => {
  const station = await Station.findByIdAndUpdate(req.user.station_id, req.body, {
    new: true,
    runValidators: true,
  });
  success(res, station, 'Station updated');
};
