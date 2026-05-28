# PostgreSQL Setup Guide

## Installation

### Linux (Ubuntu/Debian)
```bash
# Update package manager
sudo apt update
sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### macOS
```bash
# Using Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Check status
brew services list
```

### Windows
1. Download installer from https://www.postgresql.org/download/windows/
2. Run installer
3. Choose default settings
4. Remember the superuser password

## Database Setup

### Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# In PostgreSQL CLI:
CREATE DATABASE total_lakay_db;
CREATE USER postgres WITH PASSWORD 'your_password';
ALTER ROLE postgres SET client_encoding TO 'utf8';
ALTER ROLE postgres SET default_transaction_isolation TO 'read committed';
ALTER ROLE postgres SET default_transaction_deferrable TO on;
ALTER ROLE postgres SET default_transaction_level TO 'read committed';
ALTER ROLE postgres SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE total_lakay_db TO postgres;
\q
```

### Verify Setup

```bash
# Connect to new database
psql -U postgres -d total_lakay_db

# Check connection
\dt  # List tables
\du  # List users
\q   # Quit
```

## Environment Configuration

### .env File

Create `.env` in the `backend` directory:

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=total_lakay_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_DIALECT=postgres

# Node
NODE_ENV=development
PORT=5000

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRE=7d

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000

# Stripe (get from https://stripe.com)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Email (optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=app_password

# Cloudinary (optional - for image hosting)
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## Connection String

### For Development
```
postgresql://postgres:your_password@localhost:5432/total_lakay_db
```

### For Production
```
postgresql://user:password@host:port/database_name
```

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Start PostgreSQL if needed
sudo systemctl start postgresql  # Linux
brew services start postgresql@15  # macOS
```

### Authentication Failed
```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'new_password';
\q
```

### Database Already Exists
```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS total_lakay_db;"
psql -U postgres -c "CREATE DATABASE total_lakay_db;"
```

### Port Already in Use
```bash
# Find process using port 5432
lsof -i :5432

# Change PostgreSQL port in postgresql.conf or use different port in .env
```

## Backup & Restore

### Backup Database
```bash
# Full backup
pg_dump -U postgres total_lakay_db > backup.sql

# Compressed backup
pg_dump -U postgres -Fc total_lakay_db > backup.dump
```

### Restore Database
```bash
# Restore from SQL
psql -U postgres total_lakay_db < backup.sql

# Restore from dump
pg_restore -U postgres -d total_lakay_db backup.dump
```

## Remote Connection

### Allow Remote Connections

Edit `/etc/postgresql/15/main/postgresql.conf`:
```
listen_addresses = '*'
```

Edit `/etc/postgresql/15/main/pg_hba.conf`:
```
host    all             all             0.0.0.0/0               md5
```

Then restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## Best Practices

1. **Regular Backups** - Schedule daily backups
2. **Use SSL** - Enable SSL for connections
3. **Strong Passwords** - Use complex passwords
4. **Monitor** - Monitor database performance
5. **Optimize** - Regular index maintenance
6. **Updates** - Keep PostgreSQL updated

---

For more information: https://www.postgresql.org/docs/
