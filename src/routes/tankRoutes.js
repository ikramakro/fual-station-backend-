import { Router } from 'express';
import * as ctrl from '../controllers/tankController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', asyncHandler(ctrl.listTanks));
router.post('/', rbac('owner', 'manager'), asyncHandler(ctrl.createTank));
router.get('/:id/stock', asyncHandler(ctrl.getTankStock));
router.get('/:id', asyncHandler(ctrl.getTank));
router.put('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.updateTank));
router.delete('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.deleteTank));

export default router;
