import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { DELIVERY_STATUS } from '../config/constants.js';

const Delivery = sequelize.define('Delivery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  deliveryAgentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM(...Object.values(DELIVERY_STATUS)),
    defaultValue: DELIVERY_STATUS.PENDING
  },
  pickupLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true
  },
  deliveryLocation: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true
  },
  estimatedDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trackingUpdates: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  proofOfDelivery: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      signature: null,
      photo: null,
      timestamp: null
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'deliveries',
  paranoid: true
});

export default Delivery;
