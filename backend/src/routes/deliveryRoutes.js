import express from 'express';
import deliveryController from '../controllers/deliveryController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// All delivery routes require authentication
router.get('/', auth, authorize('delivery'), deliveryController.getDeliveryAssignments);
router.get('/stats', auth, authorize('delivery'), deliveryController.getDeliveryStats);
router.post('/:id/accept', auth, authorize('delivery'), deliveryController.acceptDelivery);
router.put('/:id/status', auth, authorize('delivery'), deliveryController.updateDeliveryStatus);
router.post('/:id/complete', auth, authorize('delivery'), deliveryController.completeDelivery);

export default router;
