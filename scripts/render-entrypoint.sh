#!/bin/bash

# Render deployment check script
echo "🚀 Starting SIH28 Deployment Check..."

# Check if required environment variables are set
echo "📋 Checking Environment Variables..."

# Database
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

# Django
if [ -z "$SECRET_KEY" ]; then
    echo "❌ SECRET_KEY not set"
    exit 1
fi

# Set defaults
export DEBUG=${DEBUG:-False}
export ALLOWED_HOSTS=${ALLOWED_HOSTS:-"*"}

echo "✅ Environment variables OK"

# Check if this is Django service
if [ "$SERVICE_TYPE" = "django" ]; then
    echo "🔧 Starting Django service..."
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
    exec gunicorn --bind 0.0.0.0:$PORT erp.wsgi:application
fi

# Check if this is FastAPI service
if [ "$SERVICE_TYPE" = "fastapi" ]; then
    echo "🔧 Starting FastAPI service..."
    exec uvicorn main:app --host 0.0.0.0 --port $PORT
fi

# Check if this is Frontend service
if [ "$SERVICE_TYPE" = "frontend" ]; then
    echo "🔧 Starting Frontend service..."
    exec node server.js
fi

echo "❌ Unknown service type: $SERVICE_TYPE"
exit 1