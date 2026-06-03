import { Router } from 'express';
import * as ctrl from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/trial-balance', rbac('owner', 'manager'), asyncHandler(ctrl.trialBalance));
router.get('/profit-loss', rbac('owner', 'manager'), asyncHandler(ctrl.profitLoss));
router.get('/balance-sheet', rbac('owner', 'manager'), asyncHandler(ctrl.balanceSheet));
router.get('/customer-aging', rbac('owner', 'manager'), asyncHandler(ctrl.customerAging));
router.get('/stock-ledger', rbac('owner', 'manager'), asyncHandler(ctrl.stockLedger));
router.get('/gain-loss', rbac('owner', 'manager'), asyncHandler(ctrl.gainLoss));
router.get('/sales-summary', rbac('owner', 'manager'), asyncHandler(ctrl.salesSummary));
router.get('/purchase-summary', rbac('owner', 'manager'), asyncHandler(ctrl.purchaseSummary));
router.get('/payable-receivable', rbac('owner', 'manager'), asyncHandler(ctrl.payableReceivable));

export default router;
