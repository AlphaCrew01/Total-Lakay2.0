import express from 'express';
import productController from '../controllers/productController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Protected routes (Admin only)
router.post('/', auth, authorize('admin'), productController.createProduct);
router.put('/:id', auth, authorize('admin'), productController.updateProduct);
router.delete('/:id', auth, authorize('admin'), productController.deleteProduct);

export default router;
