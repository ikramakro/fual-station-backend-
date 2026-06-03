import { Router } from 'express';
import * as ctrl from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/', rbac('owner', 'manager'), asyncHandler(ctrl.listUsers));
router.post('/', rbac('owner'), asyncHandler(ctrl.createUser));
router.get('/:id', asyncHandler(ctrl.getUser));
router.put('/:id', rbac('owner'), asyncHandler(ctrl.updateUser));
router.delete('/:id', rbac('owner'), asyncHandler(ctrl.deleteUser));
router.put('/:id/pin', asyncHandler(ctrl.setPin));

export default router;
