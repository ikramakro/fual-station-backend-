import { Router } from 'express';
import * as ctrl from '../controllers/stationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { requireSuperAdmin } from '../middleware/permissionMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/all', requireSuperAdmin, asyncHandler(ctrl.listStations));
router.post('/', requireSuperAdmin, asyncHandler(ctrl.createStation));
router.get('/alerts', rbac('owner', 'manager'), asyncHandler(ctrl.listLowFuelAlerts));
router.post('/alerts/check', rbac('owner', 'manager'), asyncHandler(ctrl.checkLowFuelAlerts));
router.put('/alerts/:id/resolve', rbac('owner', 'manager'), asyncHandler(ctrl.resolveLowFuelAlert));
router.get('/alert-settings', rbac('owner'), asyncHandler(ctrl.getAlertSettings));
router.put('/alert-settings', rbac('owner'), asyncHandler(ctrl.updateAlertSettings));
router.get('/', asyncHandler(ctrl.getStation));
router.put('/', rbac('owner'), asyncHandler(ctrl.updateStation));

export default router;
