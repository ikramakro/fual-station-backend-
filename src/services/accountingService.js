import Account from '../models/Account.js';
import Voucher from '../models/Voucher.js';
import { generateSequenceNumber } from '../utils/sequenceGenerator.js';
import { AppError } from '../middleware/errorHandler.js';
import { SYSTEM_ACCOUNT_CODES } from '../utils/constants.js';

export async function getSystemAccount(stationId, code) {
  const account = await Account.findOne({ station_id: stationId, code, is_active: true });
  if (!account) throw new AppError(`System account ${code} not found`, 500);
  return account;
}

function validateBalancedItems(items) {
  const totalDebit = items.reduce((s, i) => s + (i.debit || 0), 0);
  const totalCredit = items.reduce((s, i) => s + (i.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError('Voucher must be balanced: total debit must equal total credit', 400);
  }
  return { totalDebit, totalCredit };
}

export async function createVoucher({
  stationId,
  userId,
  voucherType,
  items,
  narration,
  referenceNo,
  date = new Date(),
}) {
  const { totalDebit, totalCredit } = validateBalancedItems(items);

  const voucherNumber = await generateSequenceNumber(stationId, 'VOUCHER', 'VCH');

  const voucher = await Voucher.create({
    voucher_number: voucherNumber,
    voucher_type: voucherType,
    date,
    items,
    total_debit: totalDebit,
    total_credit: totalCredit,
    narration,
    reference_no: referenceNo,
    created_by: userId,
    station_id: stationId,
  });

  for (const item of items) {
    const account = await Account.findById(item.account_id);
    if (!account) continue;
    const netChange = (item.debit || 0) - (item.credit || 0);
    if (['asset', 'expense'].includes(account.account_type)) {
      account.current_balance += netChange;
    } else {
      account.current_balance -= netChange;
    }
    await account.save();
  }

  return voucher;
}

export async function recordCashSale({ stationId, userId, amount, saleNumber }) {
  const cash = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.CASH);
  const sales = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.FUEL_SALES);
  return createVoucher({
    stationId,
    userId,
    voucherType: 'cash_receipt',
    narration: `Cash sale ${saleNumber}`,
    referenceNo: saleNumber,
    items: [
      { account_id: cash._id, debit: amount, credit: 0, description: 'Cash received' },
      { account_id: sales._id, debit: 0, credit: amount, description: 'Fuel sales' },
    ],
  });
}

export async function recordCreditSale({ stationId, userId, amount, saleNumber }) {
  const receivable = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.CUSTOMER_RECEIVABLE);
  const sales = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.FUEL_SALES);
  return createVoucher({
    stationId,
    userId,
    voucherType: 'journal',
    narration: `Credit sale ${saleNumber}`,
    referenceNo: saleNumber,
    items: [
      { account_id: receivable._id, debit: amount, credit: 0, description: 'Customer receivable' },
      { account_id: sales._id, debit: 0, credit: amount, description: 'Fuel sales' },
    ],
  });
}

export async function recordCustomerPayment({ stationId, userId, amount, referenceNo }) {
  const cash = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.CASH);
  const receivable = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.CUSTOMER_RECEIVABLE);
  return createVoucher({
    stationId,
    userId,
    voucherType: 'cash_receipt',
    narration: 'Customer payment received',
    referenceNo,
    items: [
      { account_id: cash._id, debit: amount, credit: 0, description: 'Cash received' },
      { account_id: receivable._id, debit: 0, credit: amount, description: 'Receivable cleared' },
    ],
  });
}

export async function recordPurchaseReceived({ stationId, userId, amount, poNumber }) {
  const inventory = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.INVENTORY);
  const payable = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.SUPPLIER_PAYABLE);
  return createVoucher({
    stationId,
    userId,
    voucherType: 'journal',
    narration: `Purchase received ${poNumber}`,
    referenceNo: poNumber,
    items: [
      { account_id: inventory._id, debit: amount, credit: 0, description: 'Inventory' },
      { account_id: payable._id, debit: 0, credit: amount, description: 'Supplier payable' },
    ],
  });
}

export async function recordSupplierPayment({ stationId, userId, amount, referenceNo, method = 'cash' }) {
  const payable = await getSystemAccount(stationId, SYSTEM_ACCOUNT_CODES.SUPPLIER_PAYABLE);
  const code = method === 'bank_transfer' ? SYSTEM_ACCOUNT_CODES.BANK : SYSTEM_ACCOUNT_CODES.CASH;
  const paymentAccount = await getSystemAccount(stationId, code);
  return createVoucher({
    stationId,
    userId,
    voucherType: method === 'bank_transfer' ? 'bank_payment' : 'cash_payment',
    narration: 'Supplier payment',
    referenceNo,
    items: [
      { account_id: payable._id, debit: amount, credit: 0, description: 'Payable cleared' },
      { account_id: paymentAccount._id, debit: 0, credit: amount, description: 'Payment' },
    ],
  });
}

export async function recordExpense({ stationId, userId, amount, accountId, description, method = 'cash' }) {
  const paymentCode = method === 'bank' ? SYSTEM_ACCOUNT_CODES.BANK : SYSTEM_ACCOUNT_CODES.CASH;
  const paymentAccount = await getSystemAccount(stationId, paymentCode);
  return createVoucher({
    stationId,
    userId,
    voucherType: method === 'bank' ? 'bank_payment' : 'cash_payment',
    narration: description,
    items: [
      { account_id: accountId, debit: amount, credit: 0, description },
      { account_id: paymentAccount._id, debit: 0, credit: amount, description: 'Payment' },
    ],
  });
}

export function buildAccountTree(accounts) {
  const map = new Map();
  const roots = [];

  accounts.forEach((acc) => {
    map.set(acc._id.toString(), { ...acc.toObject(), children: [] });
  });

  map.forEach((node) => {
    if (node.parent_id) {
      const parent = map.get(node.parent_id.toString());
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
