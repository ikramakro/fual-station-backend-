import { Router } from 'express';
import * as ctrl from '../controllers/accountController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/chart-of-accounts', rbac('owner', 'manager'), asyncHandler(ctrl.getChartOfAccounts));
router.post('/chart-of-accounts', rbac('owner'), asyncHandler(ctrl.createAccount));
router.put('/chart-of-accounts/:id', rbac('owner'), asyncHandler(ctrl.updateAccount));
router.get('/vouchers', rbac('owner', 'manager'), asyncHandler(ctrl.listVouchers));
router.post('/vouchers', rbac('owner', 'manager'), asyncHandler(ctrl.createVoucherHandler));
router.get('/vouchers/:id', rbac('owner', 'manager'), asyncHandler(ctrl.getVoucher));
router.get('/cheques', rbac('owner', 'manager'), asyncHandler(ctrl.listCheques));
router.post('/cheques', rbac('owner', 'manager'), asyncHandler(ctrl.createCheque));
router.put('/cheques/:id/status', rbac('owner', 'manager'), asyncHandler(ctrl.updateChequeStatus));
router.get('/expenses', rbac('owner', 'manager'), asyncHandler(ctrl.listExpenses));
router.post('/expenses', rbac('owner', 'manager'), asyncHandler(ctrl.createExpense));
router.get('/daily-activity-sheet', rbac('owner', 'manager'), asyncHandler(ctrl.getDailyActivitySheet));

export default router;
