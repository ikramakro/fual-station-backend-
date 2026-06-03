import { Router } from 'express';
import * as ctrl from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/summary', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.getSummary));

export default router;
