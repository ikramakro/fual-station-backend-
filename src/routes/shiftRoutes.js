import { Router } from 'express';
import * as ctrl from '../controllers/shiftController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/current', asyncHandler(ctrl.getCurrentShift));
router.get('/', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.listShifts));
router.post('/open', rbac('owner', 'manager', 'shift_lead', 'cashier'), asyncHandler(ctrl.openShift));
router.put('/:id/close', rbac('owner', 'manager', 'shift_lead', 'cashier'), asyncHandler(ctrl.closeShift));
router.put('/:id/approve', rbac('owner', 'manager'), asyncHandler(ctrl.approveShift));
router.get('/:id', asyncHandler(ctrl.getShift));

export default router;
