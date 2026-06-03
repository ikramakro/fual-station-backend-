import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { env } from './config/env.js';
import Station from './models/Station.js';
import User from './models/User.js';
import Supplier from './models/Supplier.js';
import ProductCategory from './models/ProductCategory.js';
import Product from './models/Product.js';
import Tank from './models/Tank.js';
import Nozzle from './models/Nozzle.js';
import Customer from './models/Customer.js';
import Account from './models/Account.js';
import FuelRate from './models/FuelRate.js';
import DipCalibrationChart from './models/DipCalibrationChart.js';
import Shift from './models/Shift.js';
import Sale from './models/Sale.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import DipReading from './models/DipReading.js';
import StockLedger from './models/StockLedger.js';
import Voucher from './models/Voucher.js';
import Expense from './models/Expense.js';
import CustomerVehicle from './models/CustomerVehicle.js';
import GainLossVoucher from './models/GainLossVoucher.js';
import { SYSTEM_ACCOUNT_CODES } from './utils/constants.js';
import { seedDemoData } from './seed/demoData.js';

function buildCalibration(capacity) {
  const entries = [];
  for (let mm = 0; mm <= 2000; mm += 100) {
    entries.push({ mm, liters: Math.round((mm / 2000) * capacity) });
  }
  return entries;
}

async function clearDatabase() {
  await Promise.all([
    Station.deleteMany({}),
    User.deleteMany({}),
    Supplier.deleteMany({}),
    ProductCategory.deleteMany({}),
    Product.deleteMany({}),
    Tank.deleteMany({}),
    Nozzle.deleteMany({}),
    Customer.deleteMany({}),
    Account.deleteMany({}),
    FuelRate.deleteMany({}),
    DipCalibrationChart.deleteMany({}),
    Shift.deleteMany({}),
    Sale.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    DipReading.deleteMany({}),
    StockLedger.deleteMany({}),
    Voucher.deleteMany({}),
    Expense.deleteMany({}),
    CustomerVehicle.deleteMany({}),
    GainLossVoucher.deleteMany({}),
  ]);
  await mongoose.connection.collection('counters').deleteMany({});
}

async function seed() {
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');

  await clearDatabase();

  const station = await Station.create({
    name: 'City Fuel Station',
    address: 'Main Boulevard, Gulberg III',
    city: 'Lahore',
    phone: '+92-42-1234567',
    ntn: '1234567-8',
    strn: 'STRN-987654',
    timezone: 'Asia/Karachi',
    currency: 'PKR',
    fiscal_year_start: 7,
    is_active: true,
  });

  const owner = await User.create({
    name: 'Station Owner',
    email: 'admin@cityfuel.com',
    phone: '+92-300-1111111',
    password: 'Admin@123',
    pin: '1234',
    role: 'owner',
    station_id: station._id,
    is_active: true,
  });

  const manager = await User.create({
    name: 'Shift Manager',
    email: 'manager@cityfuel.com',
    phone: '+92-300-2222222',
    password: 'Manager@123',
    pin: '2345',
    role: 'manager',
    station_id: station._id,
    is_active: true,
  });

  const cashier = await User.create({
    name: 'POS Cashier',
    email: 'cashier@cityfuel.com',
    phone: '+92-300-3333333',
    password: 'Cashier@123',
    pin: '5678',
    role: 'cashier',
    station_id: station._id,
    is_active: true,
  });

  const fuelCategory = await ProductCategory.create({
    name: 'Fuel',
    is_returnable: false,
    station_id: station._id,
  });

  const lubricantCategory = await ProductCategory.create({
    name: 'Lubricants',
    is_returnable: true,
    station_id: station._id,
  });

  const products = await Product.insertMany([
    { name: 'Super', category_id: fuelCategory._id, unit: 'liter', current_price: 290, is_fuel: true, station_id: station._id },
    { name: 'Diesel', category_id: fuelCategory._id, unit: 'liter', current_price: 270, is_fuel: true, station_id: station._id },
    { name: 'CNG', category_id: fuelCategory._id, unit: 'kg', current_price: 210, is_fuel: true, station_id: station._id },
    { name: 'HOBC', category_id: fuelCategory._id, unit: 'liter', current_price: 310, is_fuel: true, station_id: station._id },
    { name: 'Engine Oil 20W-50', category_id: lubricantCategory._id, unit: 'piece', current_price: 2500, is_fuel: false, station_id: station._id },
  ]);

  const [superProduct, dieselProduct, , hobcProduct] = products;

  const tanks = await Tank.insertMany([
    { code: 'T-SUPER', name: 'Super Tank', fuel_type: 'super', capacity_liters: 50000, current_stock_liters: 35000, min_stock_threshold: 5000, station_id: station._id },
    { code: 'T-DIESEL', name: 'Diesel Tank', fuel_type: 'diesel', capacity_liters: 80000, current_stock_liters: 55000, min_stock_threshold: 8000, station_id: station._id },
    { code: 'T-CNG', name: 'CNG Storage', fuel_type: 'cng', capacity_liters: 10000, current_stock_liters: 7000, min_stock_threshold: 1000, station_id: station._id },
    { code: 'T-HOBC', name: 'HOBC Tank', fuel_type: 'hobc', capacity_liters: 20000, current_stock_liters: 12000, min_stock_threshold: 2000, station_id: station._id },
  ]);

  const nozzles = [];
  const calibrationByTank = {};

  for (const tank of tanks) {
    for (let i = 1; i <= 3; i++) {
      const nozzle = await Nozzle.create({
        code: `${tank.code}-N${i}`,
        name: `${tank.name} Nozzle ${i}`,
        tank_id: tank._id,
        station_id: station._id,
      });
      nozzles.push(nozzle);
    }
    const chart = await DipCalibrationChart.create({
      tank_id: tank._id,
      entries: buildCalibration(tank.capacity_liters),
      station_id: station._id,
    });
    calibrationByTank[tank._id.toString()] = chart.entries;
  }

  const suppliers = await Supplier.insertMany([
    { name: 'Attock Petroleum', contact_person: 'Ali Khan', phone: '+92-300-4444444', email: 'ali@attock.com', credit_limit: 5000000, credit_days: 30, station_id: station._id },
    { name: 'PSO Fuel Supply', contact_person: 'Bilal Ahmed', phone: '+92-300-5555555', email: 'bilal@pso.com', credit_limit: 3000000, credit_days: 15, station_id: station._id },
    { name: 'Shell Lubricants', contact_person: 'Sara Malik', phone: '+92-300-6666666', email: 'sara@shell.com', credit_limit: 500000, credit_days: 7, station_id: station._id },
    { name: 'Total Parco', contact_person: 'Usman Raza', phone: '+92-300-7777777', email: 'usman@total.com', credit_limit: 4000000, credit_days: 21, station_id: station._id },
    { name: 'Local Oil Dealer', contact_person: 'Nadeem Hussain', phone: '+92-300-8888888', credit_limit: 200000, credit_days: 0, station_id: station._id },
  ]);

  const customers = await Customer.insertMany([
    { name: 'Walk-in Customer', customer_type: 'walk_in', station_id: station._id },
    { name: 'ABC Transport Co.', phone: '0300-111-0001', customer_type: 'corporate', credit_limit: 500000, credit_days: 30, current_balance: 125000, station_id: station._id },
    { name: 'Metro Logistics', phone: '0300-111-0002', customer_type: 'bulk', credit_limit: 1000000, credit_days: 45, current_balance: 340000, station_id: station._id },
    { name: 'City Taxi Union', phone: '0300-111-0003', customer_type: 'credit', credit_limit: 200000, credit_days: 15, current_balance: 45000, station_id: station._id },
    { name: 'Fast Courier Services', phone: '0300-111-0004', customer_type: 'corporate', credit_limit: 300000, credit_days: 30, station_id: station._id },
    { name: 'Green Valley Farms', phone: '0300-111-0005', customer_type: 'bulk', credit_limit: 150000, credit_days: 7, station_id: station._id },
    { name: 'Hamza Traders', phone: '0300-111-0006', customer_type: 'credit', credit_limit: 100000, credit_days: 15, current_balance: 28000, station_id: station._id },
    { name: 'Punjab Highway Authority', phone: '0300-111-0007', customer_type: 'corporate', credit_limit: 2000000, credit_days: 60, station_id: station._id },
    { name: 'Ride Share Fleet', phone: '0300-111-0008', customer_type: 'credit', credit_limit: 75000, credit_days: 7, station_id: station._id },
    { name: 'Industrial Zone Co.', phone: '0300-111-0009', customer_type: 'bulk', credit_limit: 800000, credit_days: 30, station_id: station._id },
  ]);

  const chartOfAccounts = [
    { code: SYSTEM_ACCOUNT_CODES.CASH, name: 'Cash in Hand', account_type: 'asset', sub_type: 'cash', is_system: true, opening_balance: 100000, current_balance: 100000 },
    { code: SYSTEM_ACCOUNT_CODES.BANK, name: 'Bank Account', account_type: 'asset', sub_type: 'bank', is_system: true, opening_balance: 500000, current_balance: 500000 },
    { code: SYSTEM_ACCOUNT_CODES.CUSTOMER_RECEIVABLE, name: 'Accounts Receivable', account_type: 'asset', sub_type: 'receivable', is_system: true },
    { code: SYSTEM_ACCOUNT_CODES.INVENTORY, name: 'Fuel Inventory', account_type: 'asset', sub_type: 'inventory', is_system: true },
    { code: SYSTEM_ACCOUNT_CODES.SUPPLIER_PAYABLE, name: 'Accounts Payable', account_type: 'liability', sub_type: 'payable', is_system: true },
    { code: '3001', name: 'Owner Equity', account_type: 'equity', sub_type: 'capital', is_system: true, opening_balance: 600000, current_balance: 600000 },
    { code: SYSTEM_ACCOUNT_CODES.FUEL_SALES, name: 'Fuel Sales Revenue', account_type: 'income', sub_type: 'sales', is_system: true },
    { code: SYSTEM_ACCOUNT_CODES.LUBRICANT_SALES, name: 'Lubricant Sales', account_type: 'income', sub_type: 'sales', is_system: true },
    { code: '5001', name: 'Salaries Expense', account_type: 'expense', sub_type: 'salary', is_system: true },
    { code: '5002', name: 'Utilities Expense', account_type: 'expense', sub_type: 'utility', is_system: true },
    { code: '5003', name: 'Maintenance Expense', account_type: 'expense', sub_type: 'maintenance', is_system: true },
  ];

  await Account.insertMany(chartOfAccounts.map((a) => ({ ...a, station_id: station._id })));

  const fuelRates = [
    { product: superProduct, price: 290 },
    { product: dieselProduct, price: 270 },
    { product: hobcProduct, price: 310 },
  ];

  for (const { product, price } of fuelRates) {
    await FuelRate.create({
      product_id: product._id,
      price_per_liter: price,
      effective_from: new Date(),
      set_by: owner._id,
      station_id: station._id,
    });
  }

  console.log('\n--- Loading demo transactions ---');
  const demo = await seedDemoData({
    station,
    owner,
    manager,
    cashier,
    products,
    tanks,
    nozzles,
    customers,
    suppliers,
    calibrationByTank,
  });

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           MVP DEMO SEED — CLIENT READY                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\nStation:', station.name, '|', station.city);
  console.log('Station ID (POS PIN):', station._id.toString());
  console.log('\n--- Login (Dashboard) ---');
  console.log('Owner:       admin@cityfuel.com     / Admin@123');
  console.log('Manager:     manager@cityfuel.com   / Manager@123');
  console.log('Shift Lead:  lead@cityfuel.com      / Lead@123');
  console.log('Cashier:     cashier@cityfuel.com   / Cashier@123');
  console.log('\n--- POS PIN login ---');
  console.log('Cashier PIN: 5678  |  Owner PIN: 1234');
  console.log('\n--- Demo data loaded ---');
  console.log(`Sales: ${demo.saleCount}  |  Today sales (PKR): ${demo.todaySalesTotal.toLocaleString()}`);
  console.log(`Purchase orders: ${demo.purchaseCount}  |  Open shift: morning`);
  console.log('Low fuel alert: HOBC tank (demo)');
  console.log('\nFrontend: http://localhost:5173');
  console.log('API:      http://localhost:5001/api\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
