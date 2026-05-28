# Deployment Guide - Total Lakay

## Production Deployment

### Prerequisites

- Production PostgreSQL database
- Node.js runtime environment
- Nginx/Apache reverse proxy
- SSL/TLS certificates
- Domain name
- Git repository

## 🚀 Backend Deployment

### Option 1: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create total-lakay-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0

# Set environment variables
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET=your_secure_secret_key \
  STRIPE_SECRET_KEY=your_stripe_key \
  FRONTEND_URL=https://yourdomain.com

# Deploy
git push heroku main
```

### Option 2: DigitalOcean

```bash
# 1. Create Ubuntu 22.04 droplet
# 2. SSH into droplet

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Clone repository
git clone <your-repo>
cd Total-Lakay2.0/backend

# Install dependencies
npm install

# Create .env file
nano .env
# Add production environment variables

# Install PM2
sudo npm install -g pm2

# Start application with PM2
pm2 start npm --name "total-lakay-backend" -- start
pm2 startup
pm2 save

# Install Nginx
sudo apt-get install -y nginx

# Configure Nginx (see configuration below)
```

### Option 3: AWS EC2

```bash
# 1. Launch EC2 instance (Ubuntu 22.04)
# 2. Create security group allowing:
#    - Port 80 (HTTP)
#    - Port 443 (HTTPS)
#    - Port 5000 (Backend)
#    - Port 3000 (Frontend)

# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Follow DigitalOcean steps above
```

### Option 4: Docker Deployment

```bash
# Build image
docker build -t total-lakay-backend:latest .

# Run container
docker run -d \
  --name total-lakay-backend \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your_secret \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  total-lakay-backend:latest
```

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd frontend
vercel

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=out
```

### Option 3: DigitalOcean App Platform

```bash
# 1. Create App on DigitalOcean
# 2. Connect GitHub repository
# 3. Configure build:
#    - Build command: npm run build
#    - Run command: npm start
# 4. Set environment variables
# 5. Deploy
```

### Option 4: Traditional VPS

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone <your-repo>
cd Total-Lakay2.0/frontend
npm install
npm run build

# Use PM2
pm2 start npm --name "total-lakay-frontend" -- start

# Configure Nginx (see below)
```

## ⚙️ Nginx Configuration

### Backend Configuration

```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    # Logging
    access_log /var/log/nginx/backend_access.log;
    error_log /var/log/nginx/backend_error.log;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

### Frontend Configuration

```nginx
upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    # Logging
    access_log /var/log/nginx/frontend_access.log;
    error_log /var/log/nginx/frontend_error.log;
    
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Production Checklist

### Security

- [ ] HTTPS/SSL enabled everywhere
- [ ] Environment variables secured (not in code)
- [ ] Database backups enabled
- [ ] Regular security updates
- [ ] Rate limiting enabled
- [ ] DDoS protection (CloudFlare recommended)
- [ ] WAF (Web Application Firewall) configured
- [ ] API keys rotated regularly
- [ ] Database encrypted at rest
- [ ] Logs monitored for suspicious activity

### Performance

- [ ] CDN enabled for static assets
- [ ] Database indexes optimized
- [ ] Caching configured (Redis)
- [ ] Compression enabled (gzip)
- [ ] Load testing completed
- [ ] Monitoring and alerts set up
- [ ] Auto-scaling configured
- [ ] Database connection pooling

### Maintenance

- [ ] Automated backups scheduled
- [ ] Disaster recovery plan
- [ ] Monitoring dashboard
- [ ] Log aggregation
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Documentation updated

## 📊 Monitoring Setup

### Application Monitoring
```bash
# Using PM2 Plus
pm2 plus

# Using New Relic
npm install newrelic
# Add to beginning of index.js:
# require('newrelic');
```

### Database Monitoring
```bash
# PostgreSQL monitoring
# Use pgAdmin or similar tool
# Configure slowlog alerts
# Set up query logging
```

### Log Aggregation
```bash
# Using ELK Stack
# Or use services like:
# - LogRocket
# - Datadog
# - Splunk
# - CloudWatch
```

## 🔄 Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Backend
        run: |
          # Deploy commands
      - name: Deploy Frontend
        run: |
          # Deploy commands
```

## 📈 Scaling Strategy

1. **Horizontal Scaling**
   - Load balancer (HAProxy/Nginx)
   - Multiple backend instances
   - Database replication

2. **Vertical Scaling**
   - Increase server resources
   - Better CPU/RAM allocation
   - Faster storage (SSD)

3. **Database Optimization**
   - Read replicas
   - Caching layer (Redis)
   - Query optimization
   - Partitioning/Sharding

## 🆘 Troubleshooting Production

### High Memory Usage
```bash
# Check processes
pm2 monit

# Restart
pm2 restart total-lakay-backend
```

### Database Connection Issues
```bash
# Check connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Increase max connections in postgresql.conf
max_connections = 200
```

### Slow API Responses
```bash
# Enable query logging
# Check slow query log
# Optimize indexes
# Add caching
```

## 📞 Support & Emergency

- Monitoring alerts → Pagerduty
- Critical issues → On-call rotation
- Incident response plan
- Communication protocol
- Rollback procedures

---

**For more help, consult your hosting provider's documentation or contact support.**
