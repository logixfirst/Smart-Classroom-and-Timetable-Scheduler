# Multi-stage Dockerfile for SIH28 Timetable Management System
# This dockerfile builds all services for production deployment

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Install ALL dependencies (dev + prod) needed for build
RUN npm ci
COPY frontend/ ./
RUN mkdir -p public
RUN npm run build

# Stage 2: Build Django Backend
FROM python:3.11-slim AS django-builder
WORKDIR /app/backend/django
# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY backend/django/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
COPY backend/django/ ./
RUN python manage.py collectstatic --noinput

# Stage 3: Build FastAPI Service
FROM python:3.11-slim AS fastapi-builder
WORKDIR /app/backend/fastapi
# Install system dependencies for ortools
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*
COPY backend/fastapi/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt
COPY backend/fastapi/ ./

# Stage 4: Frontend Production
FROM node:18-alpine AS frontend-production
WORKDIR /app
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public
COPY scripts/render-entrypoint.sh /render-entrypoint.sh
RUN chmod +x /render-entrypoint.sh
ENV SERVICE_TYPE=frontend
EXPOSE 3000
CMD ["/render-entrypoint.sh"]

# Stage 5: Django Production  
FROM python:3.11-slim AS django-production
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=django-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=django-builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --from=django-builder /app/backend/django ./

# Copy render script
COPY scripts/render-entrypoint.sh /render-entrypoint.sh
RUN chmod +x /render-entrypoint.sh

ENV SERVICE_TYPE=django
EXPOSE 8000
CMD ["/render-entrypoint.sh"]

# Stage 6: FastAPI Production
FROM python:3.11-slim AS fastapi-production
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=fastapi-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=fastapi-builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --from=fastapi-builder /app/backend/fastapi ./

# Copy render script
COPY scripts/render-entrypoint.sh /render-entrypoint.sh
RUN chmod +x /render-entrypoint.sh

ENV SERVICE_TYPE=fastapi
EXPOSE 8001
CMD ["/render-entrypoint.sh"]

# Stage 7: All-in-One Production (Render Single Container)
# Use this stage for single-container deployment with Nginx
FROM python:3.12-slim AS all-in-one

# Install system dependencies including Node.js and Nginx
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    nginx \
    gettext-base \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 for Next.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies for both Django and FastAPI
COPY backend/django/requirements.txt /app/backend/django/
COPY backend/fastapi/requirements.txt /app/backend/fastapi/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/django/requirements.txt && \
    pip install --no-cache-dir -r /app/backend/fastapi/requirements.txt && \
    pip install --no-cache-dir gunicorn uvicorn

# Copy backend applications
COPY backend/django/ /app/backend/django/
COPY backend/fastapi/ /app/backend/fastapi/

# Install frontend dependencies
COPY frontend/package*.json /app/frontend/
RUN cd /app/frontend && npm ci --only=production

# Copy frontend source and build
COPY frontend/ /app/frontend/
RUN cd /app/frontend && npm run build

# Configure Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/render.conf.template /etc/nginx/conf.d/

# Create necessary directories
RUN mkdir -p /app/backend/django/staticfiles \
    /app/backend/django/media \
    /var/cache/nginx \
    /var/log/nginx \
    /run/nginx

# Copy all-in-one startup script
COPY scripts/render-start-all.sh /app/
RUN chmod +x /app/render-start-all.sh

EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/health || exit 1

CMD ["/app/render-start-all.sh"]