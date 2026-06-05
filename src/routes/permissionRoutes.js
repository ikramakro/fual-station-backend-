import { Router } from 'express';
import * as ctrl from '../controllers/permissionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/roles', asyncHandler(ctrl.listRoles));
router.get('/me', asyncHandler(ctrl.getMyPermissions));

export default router;
