import { Router } from 'express';
import * as ctrl from '../controllers/purchaseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/orders', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.listOrders));
router.post('/orders', rbac('owner', 'manager'), asyncHandler(ctrl.createOrder));
router.get('/orders/:id', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.getOrder));
router.put('/orders/:id', rbac('owner', 'manager'), asyncHandler(ctrl.updateOrder));
router.put('/orders/:id/delivery', rbac('owner', 'manager'), asyncHandler(ctrl.updateDeliveryInfo));
router.put('/orders/:id/receive', rbac('owner', 'manager'), asyncHandler(ctrl.receiveOrder));
router.put('/orders/:id/cancel', rbac('owner', 'manager'), asyncHandler(ctrl.cancelOrder));
router.get('/payments', rbac('owner', 'manager'), asyncHandler(ctrl.listPayments));
router.post('/payments', rbac('owner', 'manager'), asyncHandler(ctrl.createPayment));
router.get('/returns', rbac('owner', 'manager'), asyncHandler(ctrl.listReturns));
router.post('/returns', rbac('owner', 'manager'), asyncHandler(ctrl.createReturn));
router.put('/returns/:id/approve', rbac('owner', 'manager'), asyncHandler(ctrl.approveReturn));
router.put('/returns/:id/reject', rbac('owner', 'manager'), asyncHandler(ctrl.rejectReturn));

export default router;
