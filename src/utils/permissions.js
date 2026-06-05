import { ROLES } from './constants.js';

export const MODULES = {
  TENANTS: 'tenants',
  STATION: 'station',
  USERS: 'users',
  SUPPLIERS: 'suppliers',
  PRODUCTS: 'products',
  PURCHASES: 'purchases',
  TANKS: 'tanks',
  NOZZLES: 'nozzles',
  INVENTORY: 'inventory',
  SALES: 'sales',
  CUSTOMERS: 'customers',
  FUEL_RATES: 'fuel_rates',
  SHIFTS: 'shifts',
  ACCOUNTS: 'accounts',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard',
  AUDIT: 'audit',
};

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  VOID: 'void',
  RECEIVE: 'receive',
  PAY: 'pay',
  SYNC: 'sync',
};

const ALL_ACTIONS = Object.values(ACTIONS);

const ROLE_PERMISSIONS = {
  super_admin: {
    [MODULES.TENANTS]: ALL_ACTIONS,
    [MODULES.STATION]: ALL_ACTIONS,
    [MODULES.USERS]: ALL_ACTIONS,
    [MODULES.SUPPLIERS]: ALL_ACTIONS,
    [MODULES.PRODUCTS]: ALL_ACTIONS,
    [MODULES.PURCHASES]: ALL_ACTIONS,
    [MODULES.TANKS]: ALL_ACTIONS,
    [MODULES.NOZZLES]: ALL_ACTIONS,
    [MODULES.INVENTORY]: ALL_ACTIONS,
    [MODULES.SALES]: ALL_ACTIONS,
    [MODULES.CUSTOMERS]: ALL_ACTIONS,
    [MODULES.FUEL_RATES]: ALL_ACTIONS,
    [MODULES.SHIFTS]: ALL_ACTIONS,
    [MODULES.ACCOUNTS]: ALL_ACTIONS,
    [MODULES.REPORTS]: ALL_ACTIONS,
    [MODULES.DASHBOARD]: ALL_ACTIONS,
    [MODULES.AUDIT]: ALL_ACTIONS,
  },
  owner: {
    [MODULES.STATION]: ALL_ACTIONS,
    [MODULES.USERS]: ALL_ACTIONS,
    [MODULES.SUPPLIERS]: ALL_ACTIONS,
    [MODULES.PRODUCTS]: ALL_ACTIONS,
    [MODULES.PURCHASES]: ALL_ACTIONS,
    [MODULES.TANKS]: ALL_ACTIONS,
    [MODULES.NOZZLES]: ALL_ACTIONS,
    [MODULES.INVENTORY]: ALL_ACTIONS,
    [MODULES.SALES]: ALL_ACTIONS,
    [MODULES.CUSTOMERS]: ALL_ACTIONS,
    [MODULES.FUEL_RATES]: ALL_ACTIONS,
    [MODULES.SHIFTS]: ALL_ACTIONS,
    [MODULES.ACCOUNTS]: ALL_ACTIONS,
    [MODULES.REPORTS]: ALL_ACTIONS,
    [MODULES.DASHBOARD]: ALL_ACTIONS,
    [MODULES.AUDIT]: [ACTIONS.READ],
  },
  manager: {
    [MODULES.STATION]: [ACTIONS.READ],
    [MODULES.USERS]: [ACTIONS.READ],
    [MODULES.SUPPLIERS]: ALL_ACTIONS,
    [MODULES.PRODUCTS]: ALL_ACTIONS,
    [MODULES.PURCHASES]: ALL_ACTIONS,
    [MODULES.TANKS]: ALL_ACTIONS,
    [MODULES.NOZZLES]: ALL_ACTIONS,
    [MODULES.INVENTORY]: ALL_ACTIONS,
    [MODULES.SALES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.VOID],
    [MODULES.CUSTOMERS]: ALL_ACTIONS,
    [MODULES.FUEL_RATES]: ALL_ACTIONS,
    [MODULES.SHIFTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.APPROVE],
    [MODULES.ACCOUNTS]: ALL_ACTIONS,
    [MODULES.REPORTS]: ALL_ACTIONS,
    [MODULES.DASHBOARD]: ALL_ACTIONS,
  },
  shift_lead: {
    [MODULES.SUPPLIERS]: [ACTIONS.READ],
    [MODULES.PRODUCTS]: [ACTIONS.READ],
    [MODULES.PURCHASES]: [ACTIONS.READ],
    [MODULES.TANKS]: [ACTIONS.READ],
    [MODULES.NOZZLES]: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE],
    [MODULES.INVENTORY]: [ACTIONS.READ, ACTIONS.CREATE],
    [MODULES.SALES]: [ACTIONS.CREATE, ACTIONS.READ],
    [MODULES.CUSTOMERS]: [ACTIONS.READ],
    [MODULES.FUEL_RATES]: [ACTIONS.READ],
    [MODULES.SHIFTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
    [MODULES.DASHBOARD]: [ACTIONS.READ],
  },
  cashier: {
    [MODULES.PRODUCTS]: [ACTIONS.READ],
    [MODULES.TANKS]: [ACTIONS.READ],
    [MODULES.NOZZLES]: [ACTIONS.READ, ACTIONS.CREATE],
    [MODULES.SALES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.SYNC],
    [MODULES.CUSTOMERS]: [ACTIONS.READ],
    [MODULES.FUEL_RATES]: [ACTIONS.READ],
    [MODULES.SHIFTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
  },
};

export const ROLE_DESCRIPTIONS = {
  super_admin: 'Full system access, manage all tenants',
  owner: 'Full tenant access, all modules, financial data',
  manager: 'Everything except owner settings. Approve refunds, time off',
  shift_lead: 'Open/close cash drawer, cash drops, view shift reports',
  cashier: 'POS only, loyalty lookup, clock in/out',
};

export function hasPermission(role, module, action) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  const moduleActions = perms[module];
  if (!moduleActions) return false;
  return moduleActions.includes(action);
}

export function getRolePermissions(role) {
  return {
    role,
    description: ROLE_DESCRIPTIONS[role] || '',
    permissions: ROLE_PERMISSIONS[role] || {},
  };
}

export function getAllRolesPermissions() {
  return ROLES.map((role) => getRolePermissions(role));
}

export function getStationScope(req) {
  if (req.user.role === 'super_admin') {
    const stationId = req.headers['x-station-id'] || req.query.station_id || req.body?.station_id;
    if (!stationId) return null;
    return stationId;
  }
  return req.user.station_id?.toString();
}
