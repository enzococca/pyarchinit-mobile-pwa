# Production Deployment Guide

This guide covers deploying PyArchInit Mobile PWA to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Option 1: VPS with Docker (Recommended)](#option-1-vps-with-docker-recommended)
  - [Option 2: Docker Compose on Single Server](#option-2-docker-compose-on-single-server)
  - [Option 3: Separate Services](#option-3-separate-services)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Database Setup](#database-setup)
- [Media Storage](#media-storage)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Backup Strategy](#backup-strategy)
- [Security Checklist](#security-checklist)

## Prerequisites

### Required
- Domain name (e.g., `pyarchinit.yourdomain.com`)
- Server with at least 2GB RAM, 2 CPU cores, 20GB storage
- PostgreSQL 12+ database (existing PyArchInit installation or new)
- SSL certificate (Let's Encrypt recommended)

### Recommended
- Separate server for database (production)
- Object storage for media files (S3, DigitalOcean Spaces, etc.)
- Monitoring service (UptimeRobot, Datadog, etc.)
- Backup solution

## Deployment Options

### Option 1: VPS with Docker (Recommended)

Best for: Most production deployments, easy scaling, isolated environments

**Step 1: Server Setup**

```bash
# On your server (Ubuntu 22.04 recommended)
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes to take effect
```

**Step 2: Clone and Configure**

```bash
# Clone repository
git clone https://github.com/enzococca/pyarchinit-mobile-pwa.git
cd pyarchinit-mobile-pwa

# Create production environment file
cp .env.example .env.production
nano .env.production
```

**Step 3: Production docker-compose.yml**

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - USE_SQLITE=false
      - PYARCHINIT_DB_HOST=${PYARCHINIT_DB_HOST}
      - PYARCHINIT_DB_PORT=${PYARCHINIT_DB_PORT}
      - PYARCHINIT_DB_NAME=${PYARCHINIT_DB_NAME}
      - PYARCHINIT_DB_USER=${PYARCHINIT_DB_USER}
      - PYARCHINIT_DB_PASSWORD=${PYARCHINIT_DB_PASSWORD}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PYARCHINIT_MEDIA_ROOT=/app/media
    volumes:
      - media_data:/app/media
      - ./logs:/app/logs
    networks:
      - pyarchinit_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    environment:
      - VITE_API_URL=https://api.yourdomain.com
    networks:
      - pyarchinit_network
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - media_data:/var/www/media:ro
    networks:
      - pyarchinit_network
    depends_on:
      - backend
      - frontend

volumes:
  media_data:
    driver: local

networks:
  pyarchinit_network:
    driver: bridge
```

**Step 4: Nginx Configuration**

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

    # Frontend
    server {
        listen 80;
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Redirect HTTP to HTTPS
        if ($scheme = http) {
            return 301 https://$server_name$request_uri;
        }

        # Frontend files
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Increase timeouts for AI processing
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Upload endpoints (separate rate limit)
        location ~ ^/api/(media/upload|notes/upload) {
            limit_req zone=upload_limit burst=5 nodelay;

            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;

            # Large file uploads
            client_max_body_size 50M;
            proxy_read_timeout 600s;
        }

        # Media files
        location /media/ {
            alias /var/www/media/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
    }
}
```

**Step 5: Deploy**

```bash
# Load environment variables
set -a
source .env.production
set +a

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Option 2: Docker Compose on Single Server

Simplest setup for small deployments with everything on one server.

```bash
# Use the existing docker-compose.yml with production .env
docker-compose up -d --build

# Setup Nginx reverse proxy on host
sudo apt install nginx certbot python3-certbot-nginx

# Configure Nginx (see nginx config above)
sudo nano /etc/nginx/sites-available/pyarchinit

# Enable site
sudo ln -s /etc/nginx/sites-available/pyarchinit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option 3: Separate Services

For maximum scalability and control.

**Backend Server:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app \
  --bind 0.0.0.0:8000 \
  --timeout 300 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
  --log-level info
```

**Frontend Server:**
```bash
cd frontend
npm install
npm run build

# Serve with Nginx or upload to CDN/Static hosting
# (Cloudflare Pages, Netlify, Vercel, AWS S3+CloudFront, etc.)
```

## SSL/HTTPS Setup

### Let's Encrypt (Free, Automated)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

### Manual Certificate

```bash
# Place your certificate files
sudo mkdir -p /etc/nginx/ssl
sudo cp your-cert.pem /etc/nginx/ssl/cert.pem
sudo cp your-key.pem /etc/nginx/ssl/key.pem
sudo chmod 600 /etc/nginx/ssl/key.pem
```

## Database Setup

### Using Existing PyArchInit Database

```bash
# In .env.production
PYARCHINIT_DB_HOST=your-db-server.com
PYARCHINIT_DB_PORT=5432
PYARCHINIT_DB_NAME=pyarchinit_db
PYARCHINIT_DB_USER=pyarchinit_user
PYARCHINIT_DB_PASSWORD=strong_password_here
USE_SQLITE=false
```

### New PostgreSQL Installation

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

CREATE DATABASE pyarchinit_mobile;
CREATE USER pyarchinit_mobile WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pyarchinit_mobile TO pyarchinit_mobile;

# Allow remote connections (if needed)
# Edit /etc/postgresql/14/main/postgresql.conf
listen_addresses = '*'

# Edit /etc/postgresql/14/main/pg_hba.conf
host    all    all    10.0.0.0/8    md5  # Adjust subnet

sudo systemctl restart postgresql
```

## Media Storage

### Local Storage (Small Deployments)

```bash
# Create media directories
sudo mkdir -p /var/www/pyarchinit/media/{original,thumb,resize}
sudo chown -R www-data:www-data /var/www/pyarchinit/media
sudo chmod -R 755 /var/www/pyarchinit/media

# In .env.production
PYARCHINIT_MEDIA_ROOT=/var/www/pyarchinit/media
```

### S3-Compatible Storage (Scalable)

```python
# Install additional packages
pip install boto3

# In .env.production
USE_S3_STORAGE=true
S3_BUCKET_NAME=pyarchinit-media
S3_REGION=eu-west-1
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_ENDPOINT=https://s3.eu-west-1.amazonaws.com  # or DigitalOcean Spaces, etc.
```

## Environment Configuration

### Production .env Template

```bash
# Database
USE_SQLITE=false
PYARCHINIT_DB_HOST=db.yourdomain.com
PYARCHINIT_DB_PORT=5432
PYARCHINIT_DB_NAME=pyarchinit_prod
PYARCHINIT_DB_USER=pyarchinit_user
PYARCHINIT_DB_PASSWORD=STRONG_PASSWORD_HERE

# Media
PYARCHINIT_MEDIA_ROOT=/var/www/media

# AI Services
OPENAI_API_KEY=sk-proj-REAL_KEY_HERE
ANTHROPIC_API_KEY=sk-ant-api03-REAL_KEY_HERE

# Security
SECRET_KEY=GENERATE_STRONG_RANDOM_STRING_HERE
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# Limits
MAX_AUDIO_SIZE=25
MAX_IMAGE_SIZE=10

# Production settings
DEBUG=false
LOG_LEVEL=INFO
WORKERS=4
```

### Generate Secure Keys

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

## Monitoring & Logging

### Application Logging

```python
# Logs are stored in backend/logs/
# - access.log: HTTP requests
# - error.log: Errors and exceptions
# - app.log: Application events

# View logs
tail -f backend/logs/app.log

# Rotate logs (configure logrotate)
sudo nano /etc/logrotate.d/pyarchinit
```

### System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Docker stats
docker stats

# Check service health
curl https://yourdomain.com/api/health
```

### External Monitoring

Set up with:
- **UptimeRobot** (https://uptimerobot.com/) - Free uptime monitoring
- **Sentry** (https://sentry.io/) - Error tracking
- **Datadog** / **New Relic** - Full observability (paid)

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U pyarchinit_user -d pyarchinit_db \
  | gzip > $BACKUP_DIR/pyarchinit_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/backup-db.sh
```

### Media Backup

```bash
# Rsync to backup server
rsync -avz --delete /var/www/pyarchinit/media/ \
  backup-server:/backups/pyarchinit/media/

# Or use object storage sync
aws s3 sync /var/www/pyarchinit/media/ \
  s3://pyarchinit-backup/media/
```

### Full System Backup

```bash
# Backup entire application
tar -czf /backups/pyarchinit_app_$(date +%Y%m%d).tar.gz \
  /opt/pyarchinit-mobile-pwa/ \
  --exclude=node_modules \
  --exclude=venv \
  --exclude=*.pyc

# Automated with Restic (recommended)
sudo apt install restic
restic init --repo /backups/restic
restic -r /backups/restic backup /opt/pyarchinit-mobile-pwa
```

## Security Checklist

### Pre-Deployment

- [ ] All API keys in `.env` (not hardcoded)
- [ ] `.env` file not in git repository
- [ ] Strong SECRET_KEY generated
- [ ] Database uses strong password
- [ ] CORS configured for production domains only
- [ ] DEBUG=false in production
- [ ] SQL injection protection (using ORM)
- [ ] Input validation enabled

### Post-Deployment

- [ ] HTTPS enabled and working
- [ ] SSL certificate valid and auto-renewing
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSH key-based authentication (disable password auth)
- [ ] Database not accessible from public internet
- [ ] Rate limiting configured
- [ ] File upload size limits enforced
- [ ] Regular security updates scheduled
- [ ] Backup system tested and working
- [ ] Monitoring and alerts configured

### Firewall Setup

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Fail2ban (brute force protection)
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

## Troubleshooting

### Logs Not Appearing

```bash
# Check Docker logs
docker-compose logs -f backend

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h your-db-host -U pyarchinit_user -d pyarchinit_db

# Check network connectivity
telnet your-db-host 5432
```

### SSL Certificate Issues

```bash
# Test SSL
openssl s_client -connect yourdomain.com:443

# Renew certificate manually
sudo certbot renew --force-renewal
```

### High Memory Usage

```bash
# Reduce Gunicorn workers
gunicorn -w 2 ...  # Instead of -w 4

# Enable swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Performance Optimization

### Enable Caching

```python
# Install Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# In backend, install redis package
pip install redis

# Configure caching in backend/config.py
```

### CDN for Static Assets

- Use Cloudflare for free CDN
- Or AWS CloudFront for better global performance
- Upload frontend build to S3, serve via CloudFront

### Database Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_us_table_sito ON us_table(sito);
CREATE INDEX idx_us_table_area ON us_table(area);
CREATE INDEX idx_mobile_notes_status ON mobile_notes(status);
```

## Cost Estimation

### Small Deployment (1-5 concurrent users)
- VPS: $12/month (DigitalOcean, Hetzner)
- Domain: $10/year
- SSL: Free (Let's Encrypt)
- Database: Included in VPS
- **Total: ~$12-15/month**

### Medium Deployment (5-20 concurrent users)
- VPS: $24/month (4GB RAM)
- Managed PostgreSQL: $15/month
- Object Storage: $5/month
- **Total: ~$44/month**

### Large Deployment (20+ concurrent users)
- VPS/Kubernetes: $60+/month
- Managed DB: $30/month
- CDN/Object Storage: $20/month
- Monitoring: $20/month
- **Total: ~$130+/month**

---

## Need Help?

- **Issues**: https://github.com/enzococca/pyarchinit-mobile-pwa/issues
- **Discussions**: https://github.com/enzococca/pyarchinit-mobile-pwa/discussions
- **Email**: Create an issue on GitHub

## License

This deployment guide is part of the PyArchInit Mobile PWA project, licensed under GPL-3.0.
