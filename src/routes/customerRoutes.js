import { Router } from 'express';
import * as ctrl from '../controllers/customerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.listCustomers));
router.post('/', rbac('owner', 'manager'), asyncHandler(ctrl.createCustomer));
router.get('/:id/balance', asyncHandler(ctrl.getCustomerBalance));
router.get('/:id/vehicles', asyncHandler(ctrl.getVehicles));
router.post('/:id/vehicles', rbac('owner', 'manager'), asyncHandler(ctrl.addVehicle));
router.get('/:id/transactions', asyncHandler(ctrl.getTransactions));
router.post('/:id/payments', rbac('owner', 'manager'), asyncHandler(ctrl.recordCustomerPayment));
router.get('/:id', asyncHandler(ctrl.getCustomer));
router.put('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.updateCustomer));
router.delete('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.deleteCustomer));

export default router;
