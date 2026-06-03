import Sale from '../models/Sale.js';
import Tank from '../models/Tank.js';
import Shift from '../models/Shift.js';
import Customer from '../models/Customer.js';
import { success } from '../utils/response.js';

export const getSummary = async (req, res) => {
  const stationId = req.user.station_id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [salesToday, tanks, openShift, receivables] = await Promise.all([
    Sale.aggregate([
      {
        $match: {
          station_id: stationId,
          is_void: false,
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total_amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Tank.find({ station_id: stationId, is_active: true }),
    Shift.findOne({ station_id: stationId, status: 'open' }).populate('opened_by', 'name'),
    Customer.aggregate([
      { $match: { station_id: stationId, is_active: true, current_balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$current_balance' } } },
    ]),
  ]);

  const litersAgg = await Sale.aggregate([
    {
      $match: {
        station_id: stationId,
        is_void: false,
        createdAt: { $gte: todayStart, $lte: todayEnd },
        sale_type: 'nozzle',
      },
    },
    { $unwind: '$items' },
    { $group: { _id: null, liters: { $sum: '$items.quantity' } } },
  ]);

  const recentSales = await Sale.find({
    station_id: stationId,
    is_void: false,
  })
    .populate('cashier_id', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  const fuelLevels = tanks.map((t) => ({
    tank_id: t._id,
    name: t.name,
    fuel_type: t.fuel_type,
    current_stock_liters: t.current_stock_liters,
    capacity_liters: t.capacity_liters,
    percentage: t.capacity_liters
      ? Math.round((t.current_stock_liters / t.capacity_liters) * 100)
      : 0,
    isLow: t.current_stock_liters < t.min_stock_threshold,
  }));

  const lowFuelAlerts = fuelLevels.filter((f) => f.isLow);

  success(res, {
    todaySales: salesToday[0]?.totalSales || 0,
    todaySaleCount: salesToday[0]?.count || 0,
    litersSold: litersAgg[0]?.liters || 0,
    openShift,
    openReceivables: receivables[0]?.total || 0,
    fuelLevels,
    lowFuelAlerts,
    recentSales,
  });
};
