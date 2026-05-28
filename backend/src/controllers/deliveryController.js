import { Delivery, Order, User, Notification } from '../models/index.js';
import { ERROR_MESSAGES, DELIVERY_STATUS, NOTIFICATION_TYPES } from '../config/constants.js';

export const deliveryController = {
  // Get delivery agent's assignments
  getDeliveryAssignments: async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let where = { deliveryAgentId: req.user.id };
      if (status) {
        where.status = status;
      }

      const deliveries = await Delivery.findAndCountAll({
        where,
        include: [
          {
            model: Order,
            attributes: ['id', 'orderNumber', 'total', 'shippingAddress', 'items']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          deliveries: deliveries.rows,
          pagination: {
            total: deliveries.count,
            pages: Math.ceil(deliveries.count / limit),
            currentPage: parseInt(page)
          }
        }
      });
    } catch (error) {
      console.error('Get delivery assignments error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Accept delivery assignment
  acceptDelivery: async (req, res) => {
    try {
      const { id } = req.params;

      const delivery = await Delivery.findByPk(id);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      if (delivery.status !== DELIVERY_STATUS.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'Delivery is not in pending status'
        });
      }

      await delivery.update({
        status: DELIVERY_STATUS.ACCEPTED,
        deliveryAgentId: req.user.id
      });

      // Update order status
      const order = await Order.findByPk(delivery.orderId);
      await order.update({ status: 'confirmed' });

      // Create notification
      await Notification.create({
        userId: order.clientId,
        type: NOTIFICATION_TYPES.DELIVERY_ACCEPTED,
        title: 'Delivery Accepted',
        message: 'Your delivery has been accepted',
        relatedId: delivery.id,
        relatedType: 'delivery'
      });

      res.json({
        success: true,
        message: 'Delivery accepted successfully',
        data: delivery
      });
    } catch (error) {
      console.error('Accept delivery error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Update delivery status
  updateDeliveryStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, location } = req.body;

      const delivery = await Delivery.findByPk(id);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      if (delivery.deliveryAgentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.FORBIDDEN
        });
      }

      const updateData = { status, notes };
      if (location) {
        updateData.deliveryLocation = `POINT(${location.lat} ${location.lng})`;
      }

      await delivery.update(updateData);

      // Add tracking update
      const trackingUpdates = delivery.trackingUpdates || [];
      trackingUpdates.push({
        status,
        timestamp: new Date(),
        location
      });

      await delivery.update({ trackingUpdates });

      // Create notification
      const order = await Order.findByPk(delivery.orderId);
      await Notification.create({
        userId: order.clientId,
        type: NOTIFICATION_TYPES.ORDER_SHIPPED,
        title: 'Delivery Update',
        message: `Your delivery status: ${status}`,
        relatedId: delivery.id,
        relatedType: 'delivery'
      });

      res.json({
        success: true,
        message: 'Delivery status updated successfully',
        data: delivery
      });
    } catch (error) {
      console.error('Update delivery status error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Complete delivery with proof
  completeDelivery: async (req, res) => {
    try {
      const { id } = req.params;
      const { proofImages, signature } = req.body;

      const delivery = await Delivery.findByPk(id);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      if (delivery.deliveryAgentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.FORBIDDEN
        });
      }

      await delivery.update({
        status: DELIVERY_STATUS.DELIVERED,
        actualDeliveryDate: new Date(),
        proofOfDelivery: {
          signature,
          photos: proofImages,
          timestamp: new Date()
        }
      });

      // Update order status
      const order = await Order.findByPk(delivery.orderId);
      await order.update({ status: 'delivered' });

      // Create notification
      await Notification.create({
        userId: order.clientId,
        type: NOTIFICATION_TYPES.ORDER_DELIVERED,
        title: 'Order Delivered',
        message: 'Your order has been delivered',
        relatedId: delivery.id,
        relatedType: 'delivery'
      });

      res.json({
        success: true,
        message: 'Delivery completed successfully',
        data: delivery
      });
    } catch (error) {
      console.error('Complete delivery error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Get delivery stats for agent
  getDeliveryStats: async (req, res) => {
    try {
      const deliveries = await Delivery.findAll({
        where: { deliveryAgentId: req.user.id }
      });

      const stats = {
        total: deliveries.length,
        delivered: deliveries.filter(d => d.status === DELIVERY_STATUS.DELIVERED).length,
        pending: deliveries.filter(d => d.status === DELIVERY_STATUS.PENDING).length,
        inDelivery: deliveries.filter(d => d.status === DELIVERY_STATUS.IN_DELIVERY).length,
        failed: deliveries.filter(d => d.status === DELIVERY_STATUS.FAILED).length
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get delivery stats error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
};

export default deliveryController;
