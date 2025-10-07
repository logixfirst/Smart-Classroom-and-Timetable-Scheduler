#!/bin/bash
set -e

echo "========================================="
echo "  SIH28 All-in-One Container Startup"
echo "========================================="

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    exit 1
fi

if [ -z "$SECRET_KEY" ]; then
    echo "❌ ERROR: SECRET_KEY not set"
    exit 1
fi

# Set port defaults
export PORT=${PORT:-10000}
export DJANGO_PORT=8000
export FASTAPI_PORT=8001
export FRONTEND_PORT=3000

echo "✅ Environment validated"
echo "   PORT: $PORT"

# Django setup
echo ""
echo "🔧 Setting up Django..."
cd /app/backend/django
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
echo "✅ Django ready"

# Start Django
echo ""
echo "🚀 Starting Django (port $DJANGO_PORT)..."
gunicorn erp.wsgi:application \
    --bind 0.0.0.0:$DJANGO_PORT \
    --workers 2 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile - &
DJANGO_PID=$!

# Start FastAPI
echo "🚀 Starting FastAPI (port $FASTAPI_PORT)..."
cd /app/backend/fastapi
uvicorn main:app \
    --host 0.0.0.0 \
    --port $FASTAPI_PORT \
    --workers 2 \
    --log-level info &
FASTAPI_PID=$!

# Start Next.js
echo "🚀 Starting Next.js (port $FRONTEND_PORT)..."
cd /app/frontend/.next/standalone
PORT=$FRONTEND_PORT node server.js &
FRONTEND_PID=$!

# Wait for services
echo ""
echo "⏳ Waiting for services (10s)..."
sleep 10

# Configure Nginx
echo ""
echo "🔧 Configuring Nginx..."
envsubst '${PORT}' < /etc/nginx/conf.d/render.conf.template > /etc/nginx/conf.d/default.conf
rm -f /etc/nginx/conf.d/render.conf.template

echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configured"
else
    echo "❌ Nginx configuration failed"
    cat /etc/nginx/conf.d/default.conf
    exit 1
fi

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $DJANGO_PID $FASTAPI_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start Nginx (foreground - keeps container alive)
echo ""
echo "========================================="
echo "  ✅ All services started!"
echo "  🌐 Application: http://0.0.0.0:$PORT"
echo "  📊 Django Admin: /admin"
echo "  🤖 FastAPI Docs: /ai/docs"
echo "  💚 Health: /health"
echo "========================================="
echo ""
echo "🚀 Starting Nginx on port $PORT..."
echo "Nginx will proxy:"
echo "  / -> Next.js (localhost:3000)"
echo "  /api/ -> Django (localhost:8000)"
echo "  /ai/ -> FastAPI (localhost:8001)"
echo ""

exec nginx -g "daemon off;"
