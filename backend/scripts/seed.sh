#!/bin/bash

# Total Lakay Database Seeder
# Creates sample data for testing

set -e

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-total_lakay_db}
DB_USER=${DB_USER:-postgres}

echo "🌱 Seeding Total Lakay Database..."

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF

-- Create Admin User
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, status, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@total-lakay.com',
  '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gBsZ14', -- password: password123
  'Admin',
  'User',
  '+1-555-0100',
  'admin',
  'active',
  NOW(),
  NOW()
);

-- Create Sample Delivery Users
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, status, "isAvailable", "createdAt", "updatedAt")
VALUES 
  ('10000000-0000-0000-0000-000000000001',
   'delivery1@total-lakay.com',
   '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gBsZ14',
   'Jean',
   'Delivery1',
   '+1-555-0101',
   'delivery',
   'active',
   true,
   NOW(),
   NOW()),
  ('10000000-0000-0000-0000-000000000002',
   'delivery2@total-lakay.com',
   '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gBsZ14',
   'Marie',
   'Delivery2',
   '+1-555-0102',
   'delivery',
   'active',
   true,
   NOW(),
   NOW());

-- Create Sample Client Users
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, status, address, "createdAt", "updatedAt")
VALUES 
  ('20000000-0000-0000-0000-000000000001',
   'client1@total-lakay.com',
   '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gBsZ14',
   'John',
   'Client1',
   '+1-555-0201',
   'client',
   'active',
   '{"street":"123 Main St","city":"Port-au-Prince","zipCode":"00000"}'::jsonb,
   NOW(),
   NOW()),
  ('20000000-0000-0000-0000-000000000002',
   'client2@total-lakay.com',
   '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gBsZ14',
   'Jane',
   'Client2',
   '+1-555-0202',
   'client',
   'active',
   '{"street":"456 Oak Ave","city":"Port-au-Prince","zipCode":"00001"}'::jsonb,
   NOW(),
   NOW());

-- Create Categories
INSERT INTO categories (id, name, slug, description, "isActive", "createdAt", "updatedAt")
VALUES 
  ('30000000-0000-0000-0000-000000000001', 'Software', 'software', 'Digital software products', true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002', 'E-Books', 'ebooks', 'Digital e-books', true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000003', 'Courses', 'courses', 'Online courses', true, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000004', 'Templates', 'templates', 'Design templates', true, NOW(), NOW());

-- Create Sample Products
INSERT INTO products (id, name, description, category, price, "discountPrice", stock, thumbnail, rating, "reviewCount", "isVirtual", "isDigital", sku, "isActive", "createdAt", "updatedAt")
VALUES 
  ('40000000-0000-0000-0000-000000000001', 
   'Project Management System', 
   'Professional project management software for teams', 
   'Software', 
   99.99, 
   79.99, 
   100, 
   'https://via.placeholder.com/300x200?text=Project+Manager', 
   4.8, 
   250,
   true, 
   true, 
   'SKU-PM-001', 
   true, 
   NOW(), 
   NOW()),
  ('40000000-0000-0000-0000-000000000002', 
   'Learn Web Development', 
   'Complete web development course from beginner to advanced', 
   'Courses', 
   149.99, 
   99.99, 
   50, 
   'https://via.placeholder.com/300x200?text=Web+Dev+Course', 
   4.9, 
   180,
   true, 
   true, 
   'SKU-WD-001', 
   true, 
   NOW(), 
   NOW()),
  ('40000000-0000-0000-0000-000000000003', 
   'Business Templates Bundle', 
   '50+ professional business templates', 
   'Templates', 
   49.99, 
   29.99, 
   1000, 
   'https://via.placeholder.com/300x200?text=Templates', 
   4.7, 
   320,
   true, 
   true, 
   'SKU-TB-001', 
   true, 
   NOW(), 
   NOW()),
  ('40000000-0000-0000-0000-000000000004', 
   'Python Programming Guide', 
   'Complete Python programming e-book', 
   'E-Books', 
   29.99, 
   19.99, 
   500, 
   'https://via.placeholder.com/300x200?text=Python+Book', 
   4.6, 
   410,
   true, 
   true, 
   'SKU-PB-001', 
   true, 
   NOW(), 
   NOW());

-- Create Sample Coupons
INSERT INTO coupons (id, code, "discountType", "discountValue", "minPurchaseAmount", "maxUses", "maxUsesPerUser", "startDate", "endDate", "isActive", "createdAt", "updatedAt")
VALUES 
  ('50000000-0000-0000-0000-000000000001',
   'WELCOME20',
   'percentage',
   20,
   0,
   1000,
   1,
   NOW(),
   NOW() + INTERVAL '30 days',
   true,
   NOW(),
   NOW()),
  ('50000000-0000-0000-0000-000000000002',
   'SAVE50',
   'fixed',
   50,
   100,
   500,
   3,
   NOW(),
   NOW() + '60 days'::interval,
   true,
   NOW(),
   NOW());

EOF

echo "✅ Database seeded successfully!"
echo ""
echo "🔑 Test Accounts:"
echo "   Admin: admin@total-lakay.com / password123"
echo "   Delivery 1: delivery1@total-lakay.com / password123"
echo "   Delivery 2: delivery2@total-lakay.com / password123"
echo "   Client 1: client1@total-lakay.com / password123"
echo "   Client 2: client2@total-lakay.com / password123"
echo ""
echo "🎁 Sample Coupons:"
echo "   WELCOME20 (20% off)"
echo "   SAVE50 ($50 off orders over $100)"
