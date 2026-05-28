import express from 'express';
import orderController from '../controllers/orderController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// All order routes require authentication
router.get('/', auth, orderController.getClientOrders);
router.get('/:id', auth, orderController.getOrderById);
router.post('/', auth, authorize('client'), orderController.createOrder);
router.post('/:id/payment', auth, orderController.processPayment);
router.delete('/:id', auth, authorize('client'), orderController.cancelOrder);

export default router;
