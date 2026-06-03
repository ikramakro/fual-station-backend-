import { Router } from 'express';
import * as ctrl from '../controllers/stationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', asyncHandler(ctrl.getStation));
router.put('/', rbac('owner'), asyncHandler(ctrl.updateStation));

export default router;
