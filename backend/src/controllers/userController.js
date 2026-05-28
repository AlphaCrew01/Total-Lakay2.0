import { User } from '../models/index.js';
import { ERROR_MESSAGES, USER_STATUS } from '../config/constants.js';
import bcryptjs from 'bcryptjs';

export const userController = {
  // Get user profile
  getUserProfile: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, phone, profileImage, bio, address } = req.body;

      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      const updates = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (phone) updates.phone = phone;
      if (profileImage) updates.profileImage = profileImage;
      if (bio) updates.bio = bio;
      if (address) updates.address = address;

      await user.update(updates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current and new password are required'
        });
      }

      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      const isPasswordValid = await bcryptjs.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const hashedPassword = await bcryptjs.hash(newPassword, 10);

      await user.update({ password: hashedPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Get all users (Admin only)
  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 20, role, status } = req.query;
      const offset = (page - 1) * limit;

      let where = {};
      if (role) where.role = role;
      if (status) where.status = status;

      const users = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          users: users.rows,
          pagination: {
            total: users.count,
            pages: Math.ceil(users.count / limit),
            currentPage: parseInt(page)
          }
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Suspend user (Admin only)
  suspendUser: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      await user.update({ status: USER_STATUS.SUSPENDED });

      res.json({
        success: true,
        message: 'User suspended successfully'
      });
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Activate user (Admin only)
  activateUser: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      await user.update({ status: USER_STATUS.ACTIVE });

      res.json({
        success: true,
        message: 'User activated successfully'
      });
    } catch (error) {
      console.error('Activate user error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
};

export default userController;
