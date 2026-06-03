export const ROLES = ['owner', 'manager', 'shift_lead', 'cashier'];

export const ROLE_HIERARCHY = {
  owner: 4,
  manager: 3,
  shift_lead: 2,
  cashier: 1,
};

export const FUEL_TYPES = ['super', 'diesel', 'cng', 'hobc'];

export const DEFAULT_TIMEZONE = 'Asia/Karachi';
export const DEFAULT_CURRENCY = 'PKR';

export const SYSTEM_ACCOUNT_CODES = {
  CASH: '1001',
  BANK: '1002',
  CUSTOMER_RECEIVABLE: '1101',
  SUPPLIER_PAYABLE: '2001',
  INVENTORY: '1201',
  FUEL_SALES: '4001',
  LUBRICANT_SALES: '4002',
};

export const STOCK_TRANSACTION_TYPES = [
  'purchase',
  'sale',
  'return',
  'adjustment',
  'gain',
  'loss',
  'transfer',
];
