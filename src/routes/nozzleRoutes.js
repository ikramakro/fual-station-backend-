import { Router } from 'express';
import * as ctrl from '../controllers/nozzleController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', asyncHandler(ctrl.listNozzles));
router.post('/', rbac('owner', 'manager'), asyncHandler(ctrl.createNozzle));
router.post('/:id/readings', rbac('owner', 'manager', 'shift_lead', 'cashier'), asyncHandler(ctrl.recordNozzleReading));
router.get('/:id/readings', rbac('owner', 'manager', 'shift_lead'), asyncHandler(ctrl.listNozzleReadings));
router.get('/:id', asyncHandler(ctrl.getNozzle));
router.put('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.updateNozzle));
router.delete('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.deleteNozzle));

export default router;
