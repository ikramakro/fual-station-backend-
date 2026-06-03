import { Router } from 'express';
import * as ctrl from '../controllers/fuelRateController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/current', asyncHandler(ctrl.getCurrentRates));
router.get('/history', rbac('owner', 'manager'), asyncHandler(ctrl.getRateHistory));
router.post('/', rbac('owner', 'manager'), asyncHandler(ctrl.setFuelRate));

export default router;
