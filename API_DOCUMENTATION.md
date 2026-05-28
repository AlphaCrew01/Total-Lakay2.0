# API Documentation - Total Lakay

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All responses follow this format:
```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

---

## 🔐 Authentication Endpoints

### Register
```
POST /auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "client" // or "delivery"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login
```
POST /auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Get Current User
```
GET /auth/me
Headers: Authorization: Bearer <token>
```

### Refresh Token
```
POST /auth/refresh-token
Headers: Authorization: Bearer <token>
```

---

## 📦 Product Endpoints

### Get All Products
```
GET /products?page=1&limit=20&category=electronics&search=laptop&sortBy=price&order=ASC
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Filter by category
- `search` (optional): Search term
- `sortBy` (optional): Sort field (default: createdAt)
- `order` (optional): ASC or DESC

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Laptop",
        "description": "High-performance laptop",
        "price": 999.99,
        "discountPrice": 899.99,
        "rating": 4.5,
        "images": ["url1", "url2"],
        "stock": 50
      }
    ],
    "pagination": {
      "total": 100,
      "pages": 5,
      "currentPage": 1,
      "perPage": 20
    }
  }
}
```

### Get Product by ID
```
GET /products/:id
```

### Create Product (Admin)
```
POST /products
Headers: Authorization: Bearer <token>
Role: admin
```

**Request:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "category": "electronics",
  "price": 99.99,
  "stock": 100,
  "images": ["url1", "url2"],
  "isVirtual": true,
  "isDigital": true
}
```

### Update Product (Admin)
```
PUT /products/:id
Headers: Authorization: Bearer <token>
Role: admin
```

### Delete Product (Admin)
```
DELETE /products/:id
Headers: Authorization: Bearer <token>
Role: admin
```

---

## 🛒 Order Endpoints

### Get User's Orders
```
GET /orders?page=1&limit=20
Headers: Authorization: Bearer <token>
```

### Get Order Details
```
GET /orders/:id
Headers: Authorization: Bearer <token>
```

### Create Order
```
POST /orders
Headers: Authorization: Bearer <token>
Role: client
```

**Request:**
```json
{
  "items": [
    {
      "productId": "uuid",
      "price": 99.99,
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Port-au-Prince",
    "zipCode": "00000",
    "country": "Haiti"
  },
  "paymentMethod": "stripe"
}
```

### Process Payment
```
POST /orders/:id/payment
Headers: Authorization: Bearer <token>
```

**Request:**
```json
{
  "stripeTokenId": "tok_visa"
}
```

### Cancel Order
```
DELETE /orders/:id
Headers: Authorization: Bearer <token>
```

---

## 🚚 Delivery Endpoints

### Get Assigned Deliveries
```
GET /deliveries?status=pending&page=1&limit=20
Headers: Authorization: Bearer <token>
Role: delivery
```

### Accept Delivery
```
POST /deliveries/:id/accept
Headers: Authorization: Bearer <token>
Role: delivery
```

### Update Delivery Status
```
PUT /deliveries/:id/status
Headers: Authorization: Bearer <token>
Role: delivery
```

**Request:**
```json
{
  "status": "in_delivery",
  "location": {
    "lat": 18.5392,
    "lng": -72.3350
  },
  "notes": "On the way"
}
```

**Status Options:**
- `pending`
- `accepted`
- `preparing`
- `in_delivery`
- `delivered`
- `failed`

### Complete Delivery
```
POST /deliveries/:id/complete
Headers: Authorization: Bearer <token>
Role: delivery
```

**Request:**
```json
{
  "proofImages": ["image_url1", "image_url2"],
  "signature": "signature_image_url"
}
```

### Get Delivery Statistics
```
GET /deliveries/stats
Headers: Authorization: Bearer <token>
Role: delivery
```

---

## 👤 User Endpoints

### Get User Profile
```
GET /users/profile
Headers: Authorization: Bearer <token>
```

### Update Profile
```
PUT /users/profile
Headers: Authorization: Bearer <token>
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "bio": "Bio text",
  "address": {
    "street": "123 Main St",
    "city": "Port-au-Prince"
  }
}
```

### Change Password
```
POST /users/change-password
Headers: Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Get All Users (Admin)
```
GET /users?page=1&limit=20&role=client&status=active
Headers: Authorization: Bearer <token>
Role: admin
```

### Suspend User (Admin)
```
PUT /users/:id/suspend
Headers: Authorization: Bearer <token>
Role: admin
```

### Activate User (Admin)
```
PUT /users/:id/activate
Headers: Authorization: Bearer <token>
Role: admin
```

---

## 🔄 Order Status Flow

```
PENDING → PAYMENT_PENDING → PAID → PROCESSING → READY → SHIPPED → DELIVERED
                                                                  → CANCELLED
                                                                  → RETURNED
```

## 💳 Payment Status Flow

```
PENDING → PROCESSING → COMPLETED
                    → FAILED → REFUNDED
```

## 🚛 Delivery Status Flow

```
PENDING → ACCEPTED → PREPARING → IN_DELIVERY → DELIVERED
                                              → FAILED
       → CANCELLED
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid input provided"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting (Recommended for Production)

Implement rate limiting to prevent abuse:
- 100 requests per 15 minutes for authentication endpoints
- 1000 requests per 15 minutes for general endpoints
- 50 requests per 15 minutes for payment endpoints

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies)
3. **Validate input** on both frontend and backend
4. **Use environment variables** for API keys
5. **Implement rate limiting** to prevent abuse
6. **Log all transactions** for audit trails
7. **Monitor API usage** and performance
8. **Keep API documentation updated**

---

## Testing Endpoints

### Using cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123"}'

# Get Products
curl http://localhost:5000/api/products

# Get User Profile (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/users/profile
```

### Using Postman

1. Create a new collection
2. Import endpoints
3. Set environment variables (API_URL, TOKEN)
4. Use `{{API_URL}}` and `{{TOKEN}}` in requests
5. Test each endpoint

---

**Total Lakay API** - Professional E-Commerce Platform
