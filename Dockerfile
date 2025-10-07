# Multi-stage Dockerfile for SIH28 Timetable Management System
# This dockerfile builds all services for production deployment

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Install dependencies with exact versions from lock file
RUN npm ci --only=production --omit=dev
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