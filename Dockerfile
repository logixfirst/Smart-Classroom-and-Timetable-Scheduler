# Multi-stage Dockerfile for SIH28 Timetable Management System
# This dockerfile builds all services for production deployment

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Django Backend
FROM python:3.11-slim AS django-builder
WORKDIR /app/backend/django
COPY backend/django/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/django/ ./
RUN python manage.py collectstatic --noinput

# Stage 3: Build FastAPI Service
FROM python:3.11-slim AS fastapi-builder
WORKDIR /app/backend/fastapi
COPY backend/fastapi/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/fastapi/ ./

# Stage 4: Final Production Image with Nginx
FROM nginx:alpine AS production

# Install required packages
RUN apk add --no-cache python3 py3-pip postgresql-client redis curl

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/ /etc/nginx/conf.d/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/out /usr/share/nginx/html/frontend
COPY --from=frontend-builder /app/frontend/.next/static /usr/share/nginx/html/_next/static

# Copy Django application
COPY --from=django-builder /app/backend/django /app/django
COPY --from=django-builder /app/backend/django/staticfiles /usr/share/nginx/html/static

# Copy FastAPI application
COPY --from=fastapi-builder /app/backend/fastapi /app/fastapi

# Create directories for logs and data
RUN mkdir -p /var/log/nginx /var/log/django /var/log/fastapi
RUN mkdir -p /app/data /app/media

# Install Python dependencies in final image
COPY backend/django/requirements.txt /tmp/django-requirements.txt
COPY backend/fastapi/requirements.txt /tmp/fastapi-requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/django-requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/fastapi-requirements.txt

# Copy startup script
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start all services
CMD ["/docker-entrypoint.sh"]