# SIH28 Timetable Management System - Docker Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- At least 4GB RAM available
- Ports 80, 443, 5432, 6379 available

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Database Configuration
DB_NAME=sih28_timetable
DB_USER=sih_user
DB_PASSWORD=your_secure_password_here
DB_HOST=postgres
DB_PORT=5432

# Django Configuration
DJANGO_SECRET_KEY=your_very_long_secret_key_here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 2. Build and Run

Build all services:
```bash
docker-compose build
```

Start the application:
```bash
docker-compose up -d
```

Initialize the database:
```bash
docker-compose exec django ./scripts/init-db.sh
```

### 3. Access the Application

- **Frontend**: http://localhost
- **Django Admin**: http://localhost/admin (admin/admin123)
- **API Documentation**: http://localhost/api/docs
- **Health Check**: http://localhost/health

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Nginx         │
│   (Next.js)     │◄──►│   (Reverse      │
│   Port: 3000    │    │   Proxy)        │
└─────────────────┘    │   Port: 80/443  │
                       └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Django        │    │   FastAPI       │    │   Static Files  │
│   (REST API)    │    │   (AI Service)  │    │   /static/      │
│   Port: 8000    │    │   Port: 8001    │    │   /media/       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                     │
        └─────────────────────┼─────────────────────┘
                              │
    ┌─────────────────┐    ┌─────────────────┐
    │   PostgreSQL    │    │   Redis         │
    │   Port: 5432    │    │   Port: 6379    │
    └─────────────────┘    └─────────────────┘
```

## 🔧 Service Details

### Nginx (Reverse Proxy)
- Routes `/api/*` → Django backend
- Routes `/ai/*` → FastAPI service  
- Routes `/*` → Next.js frontend
- Serves static files from `/static/` and `/media/`
- SSL/HTTPS ready (see `nginx/conf.d/ssl.conf.example`)

### Django Backend
- REST API for timetable management
- Admin interface at `/admin`
- Request/response logging middleware
- Static file serving
- Database migrations

### FastAPI Service
- AI-powered timetable optimization
- Algorithm integration endpoint
- WebSocket support ready
- Auto-generated API docs

### Next.js Frontend
- Modern React-based UI
- Server-side rendering
- Hot reload in development
- Export functionality (PDF, Excel, CSV, ICS)

### PostgreSQL Database
- Primary data storage
- Persistent volumes
- Health checks enabled
- Backup ready

### Redis Cache
- Session storage
- Caching layer
- Task queue support
- Performance optimization

## 📊 Development Commands

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f django
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### Database Operations
```bash
# Access Django shell
docker-compose exec django python manage.py shell

# Run migrations
docker-compose exec django python manage.py migrate

# Create superuser
docker-compose exec django python manage.py createsuperuser

# Load sample data
docker-compose exec django python manage.py loaddata fixtures/sample_data.json
```

### Scaling Services
```bash
# Scale Django workers
docker-compose up -d --scale django=3

# Scale FastAPI workers
docker-compose up -d --scale fastapi=2
```

## 🔒 Production Deployment

### SSL/HTTPS Setup

1. **Generate SSL certificates** (Let's Encrypt recommended):
```bash
# Using certbot
certbot certonly --standalone -d your-domain.com
```

2. **Update nginx configuration**:
```bash
cp nginx/conf.d/ssl.conf.example nginx/conf.d/ssl.conf
# Edit ssl.conf with your domain and certificate paths
```

3. **Update docker-compose.yml** to mount certificates:
```yaml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Environment Security

1. **Generate secure keys**:
```bash
# Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Database password
openssl rand -base64 32
```

2. **Update allowed hosts**:
```bash
DJANGO_ALLOWED_HOSTS=your-domain.com,api.your-domain.com
```

3. **Enable production mode**:
```bash
DJANGO_DEBUG=False
NODE_ENV=production
```

## 📈 Monitoring & Maintenance

### Health Checks
All services include health check endpoints:
- **Application**: `/health`
- **Database**: Built-in PostgreSQL health check
- **Redis**: Built-in Redis health check

### Log Management
Logs are configured with rotation:
- **Django**: `/app/logs/` (rotating files)
- **Nginx**: `/var/log/nginx/` (daily rotation)
- **Docker**: Use `docker-compose logs` for container logs

### Backup Strategy
```bash
# Database backup
docker-compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Media files backup
docker-compose exec django tar -czf /tmp/media_backup.tar.gz /app/media/
docker cp $(docker-compose ps -q django):/tmp/media_backup.tar.gz ./media_backup_$(date +%Y%m%d_%H%M%S).tar.gz
```

## 🐛 Troubleshooting

### Common Issues

**Services won't start**:
```bash
# Check service status
docker-compose ps

# Check specific service logs
docker-compose logs django
```

**Database connection issues**:
```bash
# Verify database is ready
docker-compose exec postgres pg_isready -U $DB_USER

# Check database logs
docker-compose logs postgres
```

**Port conflicts**:
```bash
# Check what's using ports
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

**Permission issues**:
```bash
# Fix file permissions
chmod +x scripts/init-db.sh
chmod +x backend/django/entrypoint.sh
chmod +x backend/fastapi/entrypoint.sh
```

### Performance Tuning

**Database optimization**:
- Adjust `shared_buffers` in PostgreSQL config
- Enable connection pooling
- Configure proper indexes

**Nginx optimization**:
- Enable gzip compression (already configured)
- Adjust worker processes based on CPU cores
- Configure caching headers

**Django optimization**:
- Enable database connection pooling
- Configure Redis caching
- Use WhiteNoise for static files in production

### Recovery Procedures

**Complete reset**:
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

**Restore from backup**:
```bash
# Restore database
cat backup_20240101_120000.sql | docker-compose exec -T postgres psql -U $DB_USER $DB_NAME

# Restore media files
docker cp media_backup_20240101_120000.tar.gz $(docker-compose ps -q django):/tmp/
docker-compose exec django tar -xzf /tmp/media_backup_20240101_120000.tar.gz -C /app/
```

## 🎯 Next Steps

After successful deployment:

1. **Configure authentication** (JWT implementation)
2. **Integrate real timetabling algorithms**
3. **Set up monitoring** (Prometheus/Grafana)
4. **Configure CI/CD** (GitHub Actions)
5. **Set up automated backups**
6. **Load test** with expected user volume

---

**Need help?** Check the logs first, then refer to individual service documentation in their respective directories.