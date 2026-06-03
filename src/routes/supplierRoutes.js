import { Router } from 'express';
import * as ctrl from '../controllers/supplierController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.listSuppliers));
router.post('/', rbac('owner', 'manager'), asyncHandler(ctrl.createSupplier));
router.get('/:id/balance', rbac('owner', 'manager'), asyncHandler(ctrl.getSupplierBalance));
router.get('/:id', asyncHandler(ctrl.getSupplier));
router.put('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.updateSupplier));
router.delete('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.deleteSupplier));

export default router;
