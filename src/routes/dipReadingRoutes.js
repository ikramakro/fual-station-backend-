import { Router } from 'express';
import * as ctrl from '../controllers/dipReadingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.post('/', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.createDipReading));
router.get('/gain-loss', rbac('owner', 'manager'), asyncHandler(ctrl.listGainLoss));
router.post('/gain-loss', rbac('owner', 'manager'), asyncHandler(ctrl.createGainLoss));
router.get('/calibration/:tankId', asyncHandler(ctrl.getCalibration));
router.put('/calibration/:tankId', rbac('owner', 'manager'), asyncHandler(ctrl.updateCalibration));
router.get('/', asyncHandler(ctrl.listDipReadings));

export default router;
