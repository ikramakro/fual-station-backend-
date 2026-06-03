import mongoose from 'mongoose';
import Shift from '../models/Shift.js';
import Sale from '../models/Sale.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import DipReading from '../models/DipReading.js';
import StockLedger from '../models/StockLedger.js';
import Expense from '../models/Expense.js';
import CustomerVehicle from '../models/CustomerVehicle.js';
import GainLossVoucher from '../models/GainLossVoucher.js';
import Tank from '../models/Tank.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import { generateSequenceNumber } from '../utils/sequenceGenerator.js';
import * as accounting from '../services/accountingService.js';
import { SYSTEM_ACCOUNT_CODES } from '../utils/constants.js';

function daysAgo(days, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function setDocumentDate(Model, id, date) {
  await Model.collection.updateOne({ _id: id }, { $set: { createdAt: date, updatedAt: date } });
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function litersFromMm(entries, mm) {
  if (!entries?.length) return 0;
  const sorted = [...entries].sort((a, b) => a.mm - b.mm);
  if (mm <= sorted[0].mm) return sorted[0].liters;
  if (mm >= sorted[sorted.length - 1].mm) return sorted[sorted.length - 1].liters;
  for (let i = 0; i < sorted.length - 1; i++) {
    const low = sorted[i];
    const high = sorted[i + 1];
    if (mm >= low.mm && mm <= high.mm) {
      const ratio = (mm - low.mm) / (high.mm - low.mm);
      return Math.round(low.liters + ratio * (high.liters - low.liters));
    }
  }
  return 0;
}

/**
 * Seeds transactional demo data for client presentations (sales, shifts, POs, dips, vouchers).
 */
export async function seedDemoData(ctx) {
  const {
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
  } = ctx;

  const stationId = station._id;
  const productByName = Object.fromEntries(products.map((p) => [p.name, p]));
  const tankByFuel = Object.fromEntries(tanks.map((t) => [t.fuel_type, t]));
  const nozzlesByTank = {};
  for (const n of nozzles) {
    const tid = n.tank_id.toString();
    if (!nozzlesByTank[tid]) nozzlesByTank[tid] = [];
    nozzlesByTank[tid].push(n);
  }

  const walkIn = customers.find((c) => c.name === 'Walk-in Customer');
  const creditCustomers = customers.filter((c) => c.customer_type !== 'walk_in');
  const [attock, pso, shell, total, localDealer] = suppliers;

  const shiftLead = await User.create({
    name: 'Ahmad Raza (Shift Lead)',
    email: 'lead@cityfuel.com',
    phone: '+92-300-4444000',
    password: 'Lead@123',
    pin: '3456',
    role: 'shift_lead',
    station_id: stationId,
    is_active: true,
  });

  const closedMorning = await Shift.create({
    shift_name: 'morning',
    station_id: stationId,
    opened_by: manager._id,
    closed_by: manager._id,
    opening_cash: 45000,
    closing_cash: 312000,
    total_sales: 485000,
    total_expenses: 8500,
    net_cash: 303500,
    status: 'closed',
    opened_at: daysAgo(2, 6),
    closed_at: daysAgo(2, 14),
    manager_approved: true,
    approved_by: owner._id,
  });

  const closedEvening = await Shift.create({
    shift_name: 'evening',
    station_id: stationId,
    opened_by: shiftLead._id,
    closed_by: manager._id,
    opening_cash: 50000,
    closing_cash: 428000,
    total_sales: 612000,
    total_expenses: 12000,
    net_cash: 416000,
    status: 'closed',
    opened_at: daysAgo(1, 14),
    closed_at: daysAgo(1, 22),
    manager_approved: true,
    approved_by: owner._id,
  });

  const openShift = await Shift.create({
    shift_name: 'morning',
    station_id: stationId,
    opened_by: cashier._id,
    opening_cash: 55000,
    total_sales: 0,
    status: 'open',
    opened_at: daysAgo(0, 6),
  });

  const shifts = [closedMorning, closedEvening, openShift];
  let saleSeq = 0;
  let todaySalesTotal = 0;

  const saleScenarios = [
    { product: 'Super', tank: 'super', type: 'nozzle', payment: 'cash', qtyRange: [15, 45] },
    { product: 'Diesel', tank: 'diesel', type: 'nozzle', payment: 'cash', qtyRange: [20, 80] },
    { product: 'HOBC', tank: 'hobc', type: 'nozzle', payment: 'card', qtyRange: [10, 30] },
    { product: 'Diesel', tank: 'diesel', type: 'bulk', payment: 'credit', qtyRange: [200, 500] },
    { product: 'Super', tank: 'super', type: 'credit', payment: 'credit', qtyRange: [50, 120] },
    { product: 'Engine Oil 20W-50', tank: null, type: 'lubricant', payment: 'cash', qtyRange: [1, 3] },
  ];

  async function addSale(shift, saleDate, scenarioIndex, forceToday = false) {
    const scenario = saleScenarios[scenarioIndex % saleScenarios.length];
    const product = productByName[scenario.product];
    const tank = scenario.tank ? tankByFuel[scenario.tank] : null;
    const nozzle =
      tank && nozzlesByTank[tank._id.toString()]
        ? pickRandom(nozzlesByTank[tank._id.toString()])
        : null;
    const qty =
      scenario.qtyRange[0] +
      Math.floor(Math.random() * (scenario.qtyRange[1] - scenario.qtyRange[0] + 1));
    const unitPrice = product.current_price;
    const subtotal = Math.round(qty * unitPrice);
    const isCredit = scenario.payment === 'credit';
    const customer = isCredit ? pickRandom(creditCustomers) : walkIn;

    saleSeq += 1;
    const saleNumber = `SALE-${new Date().getFullYear()}-${String(saleSeq).padStart(4, '0')}`;

    const sale = await Sale.create({
      sale_number: saleNumber,
      sale_type: scenario.type,
      customer_id: isCredit ? customer._id : walkIn._id,
      shift_id: shift._id,
      nozzle_id: nozzle?._id,
      items: [
        {
          product_id: product._id,
          quantity: qty,
          unit_price: unitPrice,
          subtotal,
          tank_id: tank?._id,
        },
      ],
      subtotal,
      discount: 0,
      total_amount: subtotal,
      payment_method: scenario.payment,
      amount_paid: isCredit ? 0 : subtotal,
      change_given: 0,
      cashier_id: cashier._id,
      station_id: stationId,
      notes: forceToday ? 'Demo sale (today)' : null,
      is_void: false,
    });

    const timestamp = forceToday ? daysAgo(0, 8 + (saleSeq % 10), (saleSeq * 7) % 60) : saleDate;
    await setDocumentDate(Sale, sale._id, timestamp);

    if (isCredit) {
      await Customer.findByIdAndUpdate(customer._id, { $inc: { current_balance: subtotal } });
      await accounting.recordCreditSale({
        stationId,
        userId: owner._id,
        amount: subtotal,
        saleNumber,
      });
    } else {
      await accounting.recordCashSale({
        stationId,
        userId: owner._id,
        amount: subtotal,
        saleNumber,
      });
    }

    if (tank) {
      await StockLedger.create({
        station_id: stationId,
        product_id: product._id,
        tank_id: tank._id,
        transaction_type: 'sale',
        reference_id: sale._id,
        reference_type: 'Sale',
        quantity_out: qty,
        balance_after: tank.current_stock_liters,
        unit_price: unitPrice,
        created_by: cashier._id,
        createdAt: timestamp,
      });
    }

    if (shift.status === 'open') {
      todaySalesTotal += subtotal;
    }
    return sale;
  }

  for (let d = 7; d >= 1; d--) {
    const shift = d <= 2 ? closedMorning : closedEvening;
    const count = d === 1 ? 8 : 5;
    for (let i = 0; i < count; i++) {
      await addSale(shift, daysAgo(d, 10 + i), i);
    }
  }

  for (let i = 0; i < 18; i++) {
    await addSale(openShift, daysAgo(0), i, true);
  }

  await Shift.findByIdAndUpdate(openShift._id, {
    total_sales: todaySalesTotal,
    net_cash: openShift.opening_cash + todaySalesTotal,
  });

  const purchaseRows = [
    {
      supplier: attock,
      status: 'received',
      product: 'Diesel',
      tank: 'diesel',
      qty: 15000,
      price: 265,
      daysAgo: 5,
      vehicle: 'LEA-4521',
      driver: 'Imran Ali',
    },
    {
      supplier: pso,
      status: 'received',
      product: 'Super',
      tank: 'super',
      qty: 10000,
      price: 285,
      daysAgo: 4,
      vehicle: 'KHI-8890',
      driver: 'Kamran Shah',
    },
    {
      supplier: total,
      status: 'received',
      product: 'HOBC',
      tank: 'hobc',
      qty: 5000,
      price: 305,
      daysAgo: 3,
      vehicle: 'RWP-3344',
      driver: 'Faisal Mehmood',
    },
    {
      supplier: shell,
      status: 'ordered',
      product: 'Engine Oil 20W-50',
      tank: null,
      qty: 48,
      price: 2350,
      daysAgo: 1,
    },
    {
      supplier: localDealer,
      status: 'ordered',
      product: 'Diesel',
      tank: 'diesel',
      qty: 8000,
      price: 268,
      daysAgo: 0,
    },
    {
      supplier: pso,
      status: 'draft',
      product: 'Super',
      tank: 'super',
      qty: 12000,
      price: 288,
      daysAgo: 0,
    },
  ];

  let poSeq = 0;
  for (const row of purchaseRows) {
    poSeq += 1;
    const product = productByName[row.product];
    const tank = row.tank ? tankByFuel[row.tank] : null;
    const subtotal = row.qty * row.price;
    const poNumber = `PO-${new Date().getFullYear()}-${String(poSeq).padStart(4, '0')}`;
    const orderedAt = daysAgo(row.daysAgo, 11);

    const po = await PurchaseOrder.create({
      po_number: poNumber,
      supplier_id: row.supplier._id,
      station_id: stationId,
      items: [
        {
          product_id: product._id,
          quantity_ordered: row.qty,
          quantity_received: row.status === 'received' ? row.qty : 0,
          unit_price: row.price,
          subtotal,
          tank_id: tank?._id,
        },
      ],
      delivery_vehicle_no: row.vehicle,
      driver_name: row.driver,
      status: row.status,
      total_amount: subtotal,
      notes: row.status === 'draft' ? 'Awaiting supplier confirmation' : 'Demo purchase order',
      ordered_by: manager._id,
      received_by: row.status === 'received' ? manager._id : undefined,
      ordered_at: orderedAt,
      received_at: row.status === 'received' ? daysAgo(row.daysAgo, 15) : undefined,
    });
    await setDocumentDate(PurchaseOrder, po._id, orderedAt);

    if (row.status === 'received' && tank) {
      await Tank.findByIdAndUpdate(tank._id, { $inc: { current_stock_liters: row.qty } });
      await StockLedger.create({
        station_id: stationId,
        product_id: product._id,
        tank_id: tank._id,
        transaction_type: 'purchase',
        reference_id: po._id,
        reference_type: 'PurchaseOrder',
        quantity_in: row.qty,
        balance_after: tank.current_stock_liters + row.qty,
        unit_price: row.price,
        created_by: manager._id,
        createdAt: daysAgo(row.daysAgo, 15),
      });
      await accounting.recordPurchaseReceived({
        stationId,
        userId: manager._id,
        amount: subtotal,
        poNumber,
      });
    }
  }

  for (const tank of tanks) {
    const entries = calibrationByTank[tank._id.toString()];
    for (const dayOffset of [0, 1, 3]) {
      const mm = 1200 + dayOffset * 80 + tanks.indexOf(tank) * 40;
      const liters = litersFromMm(entries, mm);
      const readingDate = daysAgo(dayOffset, 7);
      const dip = await DipReading.create({
        tank_id: tank._id,
        reading_mm: mm,
        calculated_liters: liters,
        temperature: 28 + dayOffset,
        density: 0.82,
        reading_date: readingDate,
        shift_id: openShift._id,
        recorded_by: shiftLead._id,
        station_id: stationId,
      });
      await setDocumentDate(DipReading, dip._id, readingDate);
    }
  }

  const hobcTank = tankByFuel.hobc;
  await Tank.findByIdAndUpdate(hobcTank._id, {
    current_stock_liters: 1800,
  });

  await GainLossVoucher.create({
    tank_id: tankByFuel.diesel._id,
    shift_id: closedEvening._id,
    book_stock: 54800,
    physical_stock: 54520,
    difference: -280,
    type: 'loss',
    reason: 'Evaporation & temperature variance (demo)',
    approved_by: manager._id,
    station_id: stationId,
    createdAt: daysAgo(1, 21),
  });

  const salaryAccount = await Account.findOne({ station_id: stationId, code: '5001' });
  const utilityAccount = await Account.findOne({ station_id: stationId, code: '5002' });

  await accounting.recordExpense({
    stationId,
    userId: manager._id,
    amount: 45000,
    accountId: salaryAccount._id,
    description: 'Staff salaries — March (demo)',
    method: 'bank',
  });

  await accounting.recordExpense({
    stationId,
    userId: manager._id,
    amount: 18500,
    accountId: utilityAccount._id,
    description: 'Electricity & generator fuel (demo)',
    method: 'cash',
  });

  const maintenanceAccount = await Account.findOne({ station_id: stationId, code: '5003' });

  await Expense.create({
    category: 'maintenance',
    amount: 12000,
    description: 'Nozzle calibration & pump maintenance',
    expense_date: daysAgo(2, 12),
    payment_method: 'cash',
    account_id: maintenanceAccount._id,
    shift_id: closedMorning._id,
    recorded_by: manager._id,
    station_id: stationId,
  });

  await Expense.create({
    category: 'office',
    amount: 3500,
    description: 'Station supplies & printing',
    expense_date: daysAgo(0, 11),
    payment_method: 'cash',
    account_id: salaryAccount._id,
    shift_id: openShift._id,
    recorded_by: cashier._id,
    station_id: stationId,
  });

  const fleetCustomers = creditCustomers.filter((c) =>
    ['ABC Transport Co.', 'Metro Logistics', 'City Taxi Union'].includes(c.name)
  );
  const vehiclePlates = [
    ['LEA-1234', 'LEA-5678'],
    ['KHI-9901', 'KHI-9902', 'KHI-9903'],
    ['LHR-4455', 'LHR-4466'],
  ];
  for (let i = 0; i < fleetCustomers.length; i++) {
    for (const plate of vehiclePlates[i]) {
      await CustomerVehicle.create({
        customer_id: fleetCustomers[i]._id,
        vehicle_number: plate,
        vehicle_type: i === 2 ? 'taxi' : 'truck',
        fuel_type: i === 1 ? 'diesel' : 'super',
        station_id: stationId,
      });
    }
  }

  await accounting.recordSupplierPayment({
    stationId,
    userId: owner._id,
    amount: 250000,
    referenceNo: 'PAY-DEMO-001',
    method: 'bank_transfer',
  });

  const counters = [
    { key: 'SALE', seq: saleSeq },
    { key: 'PO', seq: poSeq },
    { key: 'VOUCHER', seq: 5 },
  ];
  const year = new Date().getFullYear();
  for (const { key, seq } of counters) {
    await mongoose.connection.collection('counters').updateOne(
      { station_id: stationId, key, year },
      { $set: { seq } },
      { upsert: true }
    );
  }

  return {
    shiftLead,
    shifts,
    openShift,
    saleCount: saleSeq,
    todaySalesTotal,
    purchaseCount: poSeq,
  };
}
