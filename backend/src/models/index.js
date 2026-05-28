import User from './User.js';
import Product from './Product.js';
import Order from './Order.js';
import Delivery from './Delivery.js';
import Payment from './Payment.js';
import Review from './Review.js';
import Category from './Category.js';
import Notification from './Notification.js';
import Coupon from './Coupon.js';

// Define relationships
User.hasMany(Order, { foreignKey: 'clientId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

User.hasMany(Delivery, { foreignKey: 'deliveryAgentId', as: 'deliveries' });
Delivery.belongsTo(User, { foreignKey: 'deliveryAgentId', as: 'agent' });

Order.hasOne(Delivery, { foreignKey: 'orderId' });
Delivery.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasMany(Payment, { foreignKey: 'orderId' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

Payment.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Payment, { foreignKey: 'userId' });

Product.hasMany(Review, { foreignKey: 'productId' });
Review.belongsTo(Product, { foreignKey: 'productId' });

Review.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasMany(Review, { foreignKey: 'orderId' });

Review.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Review, { foreignKey: 'userId' });

Category.hasMany(Product, { foreignKey: 'category' });
Product.belongsTo(Category, { foreignKey: 'category' });

User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

export { User, Product, Order, Delivery, Payment, Review, Category, Notification, Coupon };
