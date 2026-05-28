# Total Lakay - Quick Start Guide

## 🚀 5-Minute Quick Start

### Step 1: Clone & Navigate
```bash
cd /workspaces/Total-Lakay2.0
```

### Step 2: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your database details
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=total_lakay_db
# DB_USER=postgres
# DB_PASSWORD=your_password

# Start PostgreSQL (if not already running)
# On Linux: sudo systemctl start postgresql
# On Mac: brew services start postgresql

# Create database
createdb total_lakay_db

# Start backend (development)
npm run dev
```

**Backend will start on:** http://localhost:5000

### Step 3: Setup Frontend

```bash
# From the root, go to frontend
cd ../frontend

# Install dependencies
npm install

# .env.local is already configured
# Start frontend
npm run dev
```

**Frontend will start on:** http://localhost:3000

### Step 4: Test the Application

1. Open browser: http://localhost:3000
2. Click "Register" to create an account
3. Select role: "Client" or "Delivery Agent"
4. Fill in details and register
5. Login with your credentials
6. Browse the application

## 📋 Essential Setup Checklist

- [ ] PostgreSQL installed and running
- [ ] Node.js 18+ installed
- [ ] Backend npm dependencies installed
- [ ] Backend .env configured with database details
- [ ] Frontend npm dependencies installed
- [ ] Both servers running without errors
- [ ] Can access http://localhost:3000
- [ ] Can register and login

## 🔑 Test Accounts (After Setup)

Create test accounts with different roles:

**Admin Account:**
- Email: admin@test.com
- Password: AdminPassword123
- Role: admin

**Delivery Account:**
- Email: delivery@test.com
- Password: DeliveryPassword123
- Role: delivery

**Client Account:**
- Email: client@test.com
- Password: ClientPassword123
- Role: client

## 🎯 What You Can Do Now

### As a Client:
- ✅ Register and login
- ✅ Browse products
- ✅ Add products to cart
- ✅ View profile
- ✅ Place orders (without real payment for now)
- ✅ Track orders

### As a Delivery Agent:
- ✅ Login with delivery role
- ✅ View assigned deliveries
- ✅ Accept/manage deliveries
- ✅ View statistics

### As Admin:
- ✅ Access admin dashboard
- ✅ View statistics
- ✅ Manage users, products, and orders

## 📦 Next Steps

### To Add Real Products:

```bash
# Login as admin at http://localhost:3000
# Go to Admin Dashboard
# Click "Manage Products"
# Add new products with:
# - Name
# - Description  
# - Price
# - Stock quantity
# - Upload images
```

### To Enable Stripe Payments:

1. Get Stripe API keys from https://stripe.com
2. Add to backend .env:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLIC_KEY=pk_test_...
   ```
3. Add to frontend .env.local:
   ```
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
   ```
4. Restart both servers

### To Deploy:

**Frontend (Vercel):**
```bash
cd frontend
npm run build
# Then deploy to Vercel using their CLI
```

**Backend (Heroku/DigitalOcean):**
```bash
# Create Procfile with: web: npm start
# Deploy using Heroku CLI or platform CLI
```

## ⚙️ Key Commands

### Backend Commands
```bash
cd backend

# Development server
npm run dev

# Production server
npm start

# Seed database with sample data
npm run seed
```

### Frontend Commands
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🆘 Troubleshooting

**Backend won't start:**
```bash
# Check port 5000 is free
lsof -i :5000

# Check database connection
# Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env
```

**Frontend won't start:**
```bash
# Check port 3000 is free
lsof -i :3000

# Clear cache
rm -rf .next
npm run dev
```

**Database errors:**
```bash
# Check PostgreSQL is running
psql postgres

# Create database if needed
createdb total_lakay_db

# Check tables are created
psql total_lakay_db -c "\dt"
```

## 📚 Documentation

- [Full Setup Guide](./SETUP_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Admin Guide](./GUIDE_ADMIN.md)
- [Client Guide](./GUIDE_CLIENT.md)

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express Documentation](https://expressjs.com)
- [Sequelize ORM](https://sequelize.org)
- [Stripe Integration](https://stripe.com/docs)
- [Zustand State Management](https://zustand-react.vercel.app)

## ✅ Success!

If you can:
- ✅ Register a new account
- ✅ Login successfully
- ✅ Browse the shop
- ✅ Add items to cart
- ✅ View your profile

**Congratulations! Your e-commerce platform is running!** 🎉

---

**Having issues?** Check the full [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed troubleshooting.
