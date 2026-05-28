import express from 'express';
import userController from '../controllers/userController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.get('/profile', auth, userController.getUserProfile);
router.put('/profile', auth, userController.updateProfile);
router.post('/change-password', auth, userController.changePassword);

// Admin only routes
router.get('/', auth, authorize('admin'), userController.getAllUsers);
router.put('/:id/suspend', auth, authorize('admin'), userController.suspendUser);
router.put('/:id/activate', auth, authorize('admin'), userController.activateUser);

export default router;
