import * as reports from '../services/reportService.js';
import { success } from '../utils/response.js';

export const trialBalance = async (req, res) => {
  const data = await reports.getTrialBalance(req.user.station_id, req.query.from, req.query.to);
  success(res, data);
};

export const profitLoss = async (req, res) => {
  const data = await reports.getProfitLoss(req.user.station_id, req.query.from, req.query.to);
  success(res, data);
};

export const balanceSheet = async (req, res) => {
  const data = await reports.getBalanceSheet(req.user.station_id, req.query.date);
  success(res, data);
};

export const customerAging = async (req, res) => {
  const data = await reports.getCustomerAgingReport(req.user.station_id);
  success(res, data);
};

export const stockLedger = async (req, res) => {
  const data = await reports.getStockLedgerReport(
    req.user.station_id,
    req.query.product_id,
    req.query.from,
    req.query.to
  );
  success(res, data);
};

export const gainLoss = async (req, res) => {
  const data = await reports.getGainLossReport(
    req.user.station_id,
    req.query.tank_id,
    req.query.from,
    req.query.to
  );
  success(res, data);
};

export const salesSummary = async (req, res) => {
  const data = await reports.getSalesSummary(
    req.user.station_id,
    req.query.from,
    req.query.to,
    req.query.type
  );
  success(res, data);
};

export const purchaseSummary = async (req, res) => {
  const data = await reports.getPurchaseSummary(req.user.station_id, req.query.from, req.query.to);
  success(res, data);
};

export const payableReceivable = async (req, res) => {
  const data = await reports.getPayableReceivable(req.user.station_id);
  success(res, data);
};
