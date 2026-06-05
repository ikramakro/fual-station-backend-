import { Router } from 'express';
import * as ctrl from '../controllers/auditController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', rbac('owner', 'manager', 'super_admin'), asyncHandler(ctrl.listAuditLogs));

export default router;
