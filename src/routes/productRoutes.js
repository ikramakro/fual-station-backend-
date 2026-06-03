import { Router } from 'express';
import * as ctrl from '../controllers/productController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rbac } from '../middleware/rbacMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authMiddleware);
router.get('/categories', asyncHandler(ctrl.listCategories));
router.post('/categories', rbac('owner', 'manager'), asyncHandler(ctrl.createCategory));
router.put('/categories/:id', rbac('owner', 'manager'), asyncHandler(ctrl.updateCategory));
router.delete('/categories/:id', rbac('owner', 'manager'), asyncHandler(ctrl.deleteCategory));
router.get('/', asyncHandler(ctrl.listProducts));
router.post('/', rbac('owner', 'manager'), asyncHandler(ctrl.createProduct));
router.get('/:id', asyncHandler(ctrl.getProduct));
router.put('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.updateProduct));
router.delete('/:id', rbac('owner', 'manager'), asyncHandler(ctrl.deleteProduct));

export default router;
