import FuelRate from '../models/FuelRate.js';
import Product from '../models/Product.js';
import { success } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

export const getCurrentRates = async (req, res) => {
  const fuelProducts = await Product.find({ station_id: req.user.station_id, is_fuel: true, is_active: true });
  const rates = await Promise.all(
    fuelProducts.map(async (product) => {
      const rate = await FuelRate.findOne({
        station_id: req.user.station_id,
        product_id: product._id,
        effective_to: null,
      }).sort({ effective_from: -1 });
      return {
        product,
        price_per_liter: rate?.price_per_liter ?? product.current_price,
        effective_from: rate?.effective_from,
      };
    })
  );
  success(res, rates);
};

export const getRateHistory = async (req, res) => {
  const filter = { station_id: req.user.station_id };
  if (req.query.product_id) filter.product_id = req.query.product_id;
  const history = await FuelRate.find(filter)
    .populate('product_id', 'name')
    .populate('set_by', 'name')
    .sort({ effective_from: -1 })
    .limit(100);
  success(res, history);
};

export const setFuelRate = async (req, res) => {
  const { product_id, price_per_liter, effective_from } = req.body;
  const product = await Product.findOne({ _id: product_id, station_id: req.user.station_id, is_fuel: true });
  if (!product) throw new AppError('Fuel product not found', 404);

  await FuelRate.updateMany(
    { station_id: req.user.station_id, product_id, effective_to: null },
    { effective_to: new Date() }
  );

  const rate = await FuelRate.create({
    product_id,
    price_per_liter,
    effective_from: effective_from || new Date(),
    set_by: req.user._id,
    station_id: req.user.station_id,
  });

  product.current_price = price_per_liter;
  await product.save();

  success(res, rate, 'Fuel rate updated', 201);
};

export const bulkUpdateRates = async (req, res) => {
  const { rates, effective_from } = req.body;
  if (!Array.isArray(rates) || rates.length === 0) {
    throw new AppError('Rates array required', 400);
  }

  const updated = [];
  for (const { product_id, price_per_liter } of rates) {
    const product = await Product.findOne({ _id: product_id, station_id: req.user.station_id, is_fuel: true });
    if (!product) continue;

    await FuelRate.updateMany(
      { station_id: req.user.station_id, product_id, effective_to: null },
      { effective_to: new Date() }
    );

    const rate = await FuelRate.create({
      product_id,
      price_per_liter,
      effective_from: effective_from || new Date(),
      set_by: req.user._id,
      station_id: req.user.station_id,
    });

    product.current_price = price_per_liter;
    await product.save();
    updated.push(rate);
  }

  success(res, updated, 'Bulk fuel rates updated', 201);
};
