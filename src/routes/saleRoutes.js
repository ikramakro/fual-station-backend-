import { Router } from 'express';
import * as ctrl from '../controllers/saleController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', rbac('owner', 'manager', 'shift_lead', 'cashier'), asyncHandler(ctrl.listSales));
router.post('/', rbac('owner', 'manager', 'shift_lead', 'cashier'), asyncHandler(ctrl.createSale));
router.get('/:id', asyncHandler(ctrl.getSale));
router.put('/:id/void', rbac('owner', 'manager'), asyncHandler(ctrl.voidSale));

export default router;
