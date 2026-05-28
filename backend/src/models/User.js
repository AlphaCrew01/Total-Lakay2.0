import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { USER_ROLES, USER_STATUS } from '../config/constants.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM(...Object.values(USER_ROLES)),
    defaultValue: USER_ROLES.CLIENT
  },
  status: {
    type: DataTypes.ENUM(...Object.values(USER_STATUS)),
    defaultValue: USER_STATUS.ACTIVE
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  address: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  coordinates: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: true
  },
  // For delivery agents
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  bankAccount: {
    type: DataTypes.JSON,
    allowNull: true
  },
  identityDocument: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  paranoid: true
});

export default User;
