# Total Lakay - Professional E-Commerce Platform

## 📋 Project Overview

**Total Lakay** is a professional, production-ready e-commerce platform for selling and managing virtual/digital products and services. The platform includes complete functionality for three main roles:

- **Admin**: Full control over the platform, users, products, orders, and deliveries
- **Client**: Browse products, make purchases, track orders, and review products
- **Delivery Agent**: Manage deliveries, track shipments, and confirm deliveries

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18
- Next.js 14
- TypeScript
- Zustand (State Management)
- Tailwind CSS
- Axios

**Backend:**
- Node.js
- Express.js
- Sequelize ORM
- PostgreSQL/MySQL
- JWT Authentication

**Integrations:**
- Stripe Payment Gateway
- Cloudinary for Image Hosting
- Socket.io for Real-time Updates

## 📁 Project Structure

```
Total-Lakay2.0/
├── frontend/                  # Next.js React Application
│   ├── pages/                # All pages (index, login, register, shop, cart, etc)
│   ├── components/           # Reusable components
│   ├── store/               # Zustand stores for state management
│   ├── utils/               # Utility functions
│   ├── styles/              # CSS and styling
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
│
├── backend/                  # Node.js Express Application
│   ├── src/
│   │   ├── index.js         # Main server file
│   │   ├── routes/          # API routes (auth, products, orders, deliveries, users)
│   │   ├── controllers/     # Business logic for each route
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Authentication and other middleware
│   │   ├── config/          # Database and constants
│   │   └── utils/           # Helper functions
│   ├── package.json
│   └── .env.example
│
└── Documentation files (README, guides, etc)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation & Setup

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure your .env file with:
# - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# - JWT_SECRET
# - STRIPE keys
# - Other integrations

# Create PostgreSQL database
createdb total_lakay_db

# Start the backend server
npm run dev
```

**Backend runs on:** `http://localhost:5000`

#### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Configure your .env.local with:
# - NEXT_PUBLIC_API_URL=http://localhost:5000
# - NEXT_PUBLIC_STRIPE_PUBLIC_KEY

# Start the frontend development server
npm run dev
```

**Frontend runs on:** `http://localhost:3000`

## 🔐 Authentication

### JWT-Based Authentication

The platform uses JWT (JSON Web Tokens) for secure authentication.

**Login Flow:**
1. User submits email and password
2. Backend validates credentials
3. Backend generates JWT token
4. Token is stored in localStorage
5. Token is sent in Authorization header for protected routes

### Creating an Admin Account

For initial setup, create an admin account directly in the database:

```sql
INSERT INTO users (id, email, password, firstName, lastName, role, status)
VALUES (
  gen_random_uuid(),
  'admin@total-lakay.com',
  '$2a$10$...', -- bcrypt hash of password
  'Admin',
  'User',
  'admin',
  'active'
);
```

Or use the register endpoint and manually update the role in the database.

## 📊 Database Models

### User
- ID, Email, Password
- Name, Phone, Role
- Status, Verification
- Address, Coordinates
- Profile Image, Bio

### Product
- ID, Name, Description
- Price, Discount Price
- Category, Stock
- Images, Rating
- Virtual/Digital Flags
- Download URL for digital products

### Order
- ID, Order Number
- Client ID, Items
- Subtotal, Tax, Total
- Status, Payment Status
- Shipping/Billing Address
- Delivery ID, Tracking Number

### Delivery
- ID, Order ID, Agent ID
- Status, Locations
- Pickup/Delivery Timestamps
- Proof of Delivery
- Tracking Updates
- Rating & Feedback

### Payment
- ID, Order ID, User ID
- Amount, Currency
- Method, Status
- Transaction ID
- Refund Information

### Review
- ID, Product ID, User ID
- Rating, Title, Comment
- Images, Verification Status

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh-token` - Refresh JWT token

### Products
- `GET /api/products` - Get all products (paginated, searchable, filterable)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `POST /api/orders/:id/payment` - Process payment
- `DELETE /api/orders/:id` - Cancel order

### Deliveries
- `GET /api/deliveries` - Get assigned deliveries (Delivery agent)
- `POST /api/deliveries/:id/accept` - Accept delivery
- `PUT /api/deliveries/:id/status` - Update delivery status
- `POST /api/deliveries/:id/complete` - Complete delivery with proof

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/change-password` - Change password
- `GET /api/users` - Get all users (Admin only)
- `PUT /api/users/:id/suspend` - Suspend user (Admin only)
- `PUT /api/users/:id/activate` - Activate user (Admin only)

## 🎯 Features

### Client Features
- ✅ Register/Login
- ✅ Browse products with search and filters
- ✅ Add products to cart
- ✅ Persistent cart
- ✅ Checkout with real Stripe payments
- ✅ Order history and tracking
- ✅ Leave reviews and ratings
- ✅ Manage profile and addresses
- ✅ Real-time notifications

### Delivery Agent Features
- ✅ View assigned deliveries
- ✅ Accept/reject deliveries
- ✅ Update delivery status
- ✅ Real-time tracking with GPS
- ✅ Upload proof of delivery
- ✅ View earnings and statistics
- ✅ Mark availability online/offline

### Admin Features
- ✅ Dashboard with analytics
- ✅ Manage all users
- ✅ Manage products and inventory
- ✅ View and manage orders
- ✅ Manage delivery agents
- ✅ View payments and commissions
- ✅ System logs and history
- ✅ Manage categories and promotions

## 💳 Payment Integration

### Stripe Integration

The platform integrates with Stripe for real, secure payments.

**Setup:**
1. Create Stripe account at https://stripe.com
2. Get your API keys from Stripe Dashboard
3. Add keys to backend .env:
   ```
   STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

**Payment Flow:**
1. User reviews order
2. Frontend creates Stripe payment intent
3. User provides payment details
4. Backend confirms payment with Stripe
5. Order is marked as paid
6. Delivery process begins

## 📧 Email Notifications

Real-time email notifications for:
- Order confirmation
- Payment received
- Delivery assigned
- Delivery in transit
- Delivery completed
- Order reviews

Configure SMTP in .env file.

## 🚚 Delivery System

### Real-Time Tracking
- GPS location updates
- Estimated delivery time
- Order status updates
- Proof of delivery (photo + signature)
- Customer notifications

### Delivery Statuses
- Pending
- Accepted
- Preparing
- In Delivery
- Delivered
- Failed
- Cancelled

## 🔒 Security

### Implemented Security Measures
- ✅ Password hashing with bcryptjs
- ✅ JWT token-based authentication
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation and sanitization
- ✅ Rate limiting (recommended for production)
- ✅ HTTPS enforcement (production)
- ✅ Secure payment processing
- ✅ Data encryption
- ✅ SQL injection prevention (ORM)

### Best Practices for Production
1. Enable HTTPS everywhere
2. Use environment variables for secrets
3. Implement rate limiting
4. Add request logging
5. Set up monitoring and alerts
6. Regular security audits
7. Backup database regularly
8. Keep dependencies updated

## 📈 Deployment

### Frontend Deployment (Vercel recommended)
```bash
cd frontend
npm run build
# Deploy to Vercel or similar platform
```

### Backend Deployment

Options:
- Heroku
- DigitalOcean
- AWS EC2
- Docker container

Ensure:
1. Environment variables are set
2. Database is accessible
3. HTTPS is enforced
4. All dependencies are installed
5. Error logging is configured

## 🧪 Testing

### API Testing with Curl/Postman

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
- Check PostgreSQL is running
- Verify DB credentials in .env
- Ensure database is created

**CORS Error**
- Check FRONTEND_URL in backend .env
- Verify CORS middleware configuration

**Payment Not Processing**
- Verify Stripe keys
- Check payment intent creation
- Review Stripe logs

**JWT Token Expired**
- Token expires after 7 days by default
- Client should refresh token or re-login

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review error logs
3. Check API responses
4. Verify environment configuration

## 📝 License

ISC License

## 👥 Contributors

AlphaCrew01

---

**Total Lakay - Powered by Professional E-Commerce Technology**
