import { Order, Payment, Notification } from '../models/index.js';
import { ERROR_MESSAGES, ORDER_STATUS, PAYMENT_STATUS, NOTIFICATION_TYPES } from '../config/constants.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const orderController = {
  // Get all orders for client
  getClientOrders: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const orders = await Order.findAndCountAll({
        where: { clientId: req.user.id },
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Payment,
            attributes: ['id', 'status', 'amount', 'method']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          orders: orders.rows,
          pagination: {
            total: orders.count,
            pages: Math.ceil(orders.count / limit),
            currentPage: parseInt(page)
          }
        }
      });
    } catch (error) {
      console.error('Get client orders error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Get order by ID
  getOrderById: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findByPk(id, {
        include: [
          {
            model: Payment,
            attributes: ['id', 'status', 'amount', 'method', 'transactionId']
          }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      // Check authorization
      if (order.clientId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.FORBIDDEN
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get order by id error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Create order
  createOrder: async (req, res) => {
    try {
      const { items, shippingAddress, billingAddress, paymentMethod, couponCode } = req.body;

      if (!items || items.length === 0 || !shippingAddress) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Calculate totals
      let subtotal = 0;
      items.forEach(item => {
        subtotal += item.price * item.quantity;
      });

      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax; // Shipping handled separately

      const orderNumber = `ORD-${Date.now()}`;

      const order = await Order.create({
        orderNumber,
        clientId: req.user.id,
        items,
        subtotal,
        tax,
        total,
        status: ORDER_STATUS.PENDING,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        couponCode
      });

      // Create notification
      await Notification.create({
        userId: req.user.id,
        type: NOTIFICATION_TYPES.ORDER_PLACED,
        title: 'Order Placed',
        message: `Your order ${orderNumber} has been created`,
        relatedId: order.id,
        relatedType: 'order'
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Process payment for order
  processPayment: async (req, res) => {
    try {
      const { orderId, stripeTokenId } = req.body;

      const order = await Order.findByPk(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      // Check authorization
      if (order.clientId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.FORBIDDEN
        });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100), // Stripe expects cents
        currency: 'usd',
        metadata: {
          orderId: order.id
        }
      });

      // Create payment record
      const payment = await Payment.create({
        orderId: order.id,
        userId: req.user.id,
        amount: order.total,
        method: 'stripe',
        status: PAYMENT_STATUS.PROCESSING,
        stripePaymentIntentId: paymentIntent.id
      });

      // Update order status
      await order.update({
        status: ORDER_STATUS.PAYMENT_PENDING,
        paymentStatus: PAYMENT_STATUS.PROCESSING
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          payment
        }
      });
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  },

  // Cancel order
  cancelOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findByPk(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }

      if (order.clientId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.FORBIDDEN
        });
      }

      if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel order in current status'
        });
      }

      await order.update({ status: ORDER_STATUS.CANCELLED });

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
};

export default orderController;
