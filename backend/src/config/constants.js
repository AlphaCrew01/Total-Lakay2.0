// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  DELIVERY: 'delivery'
};

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked'
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  READY: 'ready',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned'
};

// Delivery Status
export const DELIVERY_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  IN_DELIVERY: 'in_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL_REFUND: 'partial_refund'
};

// Payment Methods
export const PAYMENT_METHODS = {
  CARD: 'card',
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'bank_transfer',
  CASH_ON_DELIVERY: 'cash_on_delivery'
};

// Commission Types
export const COMMISSION_TYPES = {
  PRODUCT_SALE: 'product_sale',
  DELIVERY: 'delivery',
  SUBSCRIPTION: 'subscription'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  PAYMENT_RECEIVED: 'payment_received',
  DELIVERY_ASSIGNED: 'delivery_assigned',
  DELIVERY_ACCEPTED: 'delivery_accepted',
  DELIVERY_COMPLETED: 'delivery_completed',
  USER_REGISTERED: 'user_registered',
  NEW_MESSAGE: 'new_message'
};

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  INVALID_INPUT: 'Invalid input provided',
  DUPLICATE_EMAIL: 'Email already registered',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_EXPIRED: 'Token has expired',
  SERVER_ERROR: 'Internal server error'
};

export default {
  USER_ROLES,
  USER_STATUS,
  ORDER_STATUS,
  DELIVERY_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  COMMISSION_TYPES,
  NOTIFICATION_TYPES,
  ERROR_MESSAGES
};
