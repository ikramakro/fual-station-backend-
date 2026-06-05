import Customer from '../models/Customer.js';
import CustomerVehicle from '../models/CustomerVehicle.js';
import Sale from '../models/Sale.js';
import SalePayment from '../models/SalePayment.js';
import { getCustomerAgingReport } from '../services/reportService.js';
import * as accounting from '../services/accountingService.js';
import { success, paginated } from '../utils/response.js';
import { getPagination, buildPaginationMeta, buildSearchFilter } from '../utils/pagination.js';
import { AppError } from '../middleware/errorHandler.js';

export const listCustomers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {
    station_id: req.user.station_id,
    is_active: req.query.includeInactive !== 'true',
    ...buildSearchFilter(req.query.search, ['name', 'phone']),
  };
  if (filter.is_active === false) delete filter.is_active;
  const [items, total] = await Promise.all([
    Customer.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Customer.countDocuments(filter),
  ]);
  paginated(res, items, buildPaginationMeta(total, page, limit));
};

export const getCustomer = async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!customer) throw new AppError('Customer not found', 404);
  success(res, customer);
};

export const createCustomer = async (req, res) => {
  const customer = await Customer.create({ ...req.body, station_id: req.user.station_id });
  success(res, customer, 'Customer created', 201);
};

export const updateCustomer = async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!customer) throw new AppError('Customer not found', 404);
  success(res, customer, 'Customer updated');
};

export const deleteCustomer = async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, station_id: req.user.station_id },
    { is_active: false },
    { new: true }
  );
  if (!customer) throw new AppError('Customer not found', 404);
  success(res, customer, 'Customer deactivated');
};

export const getCustomerBalance = async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!customer) throw new AppError('Customer not found', 404);
  const aging = (await getCustomerAgingReport(req.user.station_id)).find(
    (a) => a.customer_id.toString() === customer._id.toString()
  );
  success(res, { customer, aging });
};

export const getVehicles = async (req, res) => {
  const vehicles = await CustomerVehicle.find({
    customer_id: req.params.id,
    station_id: req.user.station_id,
  });
  success(res, vehicles);
};

export const addVehicle = async (req, res) => {
  const vehicle = await CustomerVehicle.create({
    ...req.body,
    customer_id: req.params.id,
    station_id: req.user.station_id,
  });
  success(res, vehicle, 'Vehicle added', 201);
};

export const updateVehicle = async (req, res) => {
  const vehicle = await CustomerVehicle.findOneAndUpdate(
    { _id: req.params.vehicleId, customer_id: req.params.id, station_id: req.user.station_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  success(res, vehicle, 'Vehicle updated');
};

export const deleteVehicle = async (req, res) => {
  const vehicle = await CustomerVehicle.findOneAndDelete({
    _id: req.params.vehicleId,
    customer_id: req.params.id,
    station_id: req.user.station_id,
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  success(res, vehicle, 'Vehicle removed');
};

export const getTransactions = async (req, res) => {
  const [sales, payments] = await Promise.all([
    Sale.find({ customer_id: req.params.id, station_id: req.user.station_id }).sort({ createdAt: -1 }),
    SalePayment.find({ customer_id: req.params.id, station_id: req.user.station_id }).sort({ payment_date: -1 }),
  ]);
  success(res, { sales, payments });
};

export const recordCustomerPayment = async (req, res) => {
  const { amount, payment_method, reference_no, payment_date } = req.body;
  const customer = await Customer.findOne({ _id: req.params.id, station_id: req.user.station_id });
  if (!customer) throw new AppError('Customer not found', 404);
  if (amount > customer.current_balance) throw new AppError('Payment exceeds balance', 400);

  const payment = await SalePayment.create({
    customer_id: customer._id,
    amount,
    payment_method,
    reference_no,
    payment_date: payment_date || new Date(),
    recorded_by: req.user._id,
    station_id: req.user.station_id,
  });

  customer.current_balance -= amount;
  await customer.save();

  await accounting.recordCustomerPayment({
    stationId: req.user.station_id,
    userId: req.user._id,
    amount,
    referenceNo: reference_no || payment._id.toString(),
  });

  success(res, payment, 'Payment recorded', 201);
};
