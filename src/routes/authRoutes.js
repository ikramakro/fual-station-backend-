import { Router } from 'express';
import * as ctrl from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', asyncHandler(ctrl.login));
router.post('/pin-login', asyncHandler(ctrl.pinLogin));
router.post('/logout', authMiddleware, asyncHandler(ctrl.logout));
router.get('/me', authMiddleware, asyncHandler(ctrl.me));
router.put('/change-password', authMiddleware, asyncHandler(ctrl.changePassword));

export default router;
