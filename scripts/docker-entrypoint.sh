#!/bin/sh
# Docker entrypoint script for SIH28 Timetable Management System

set -e

echo "🚀 Starting SIH28 Timetable Management System..."

# Wait for database
echo "⏳ Waiting for database..."
while ! pg_isready -h ${DB_HOST:-postgres} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres}; do
  echo "Waiting for database to be ready..."
  sleep 2
done
echo "✅ Database is ready!"

# Wait for Redis
echo "⏳ Waiting for Redis..."
while ! redis-cli -h ${REDIS_HOST:-redis} -p ${REDIS_PORT:-6379} ping > /dev/null 2>&1; do
  echo "Waiting for Redis to be ready..."
  sleep 2
done
echo "✅ Redis is ready!"

# Run Django migrations
echo "📊 Running Django migrations..."
cd /app/django
python manage.py migrate --noinput
echo "✅ Migrations completed!"

# Create superuser if it doesn't exist
echo "👤 Creating superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@sih28.com', 'admin123')
    print('✅ Superuser created')
else:
    print('ℹ️ Superuser already exists')
"

# Start Django in background
echo "🔧 Starting Django backend..."
cd /app/django
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Start FastAPI in background
echo "🤖 Starting FastAPI service..."
cd /app/fastapi
uvicorn main:app --host 0.0.0.0 --port 8001 &
FASTAPI_PID=$!

# Start Nginx in foreground
echo "🌐 Starting Nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Function to handle shutdown
shutdown() {
    echo "🛑 Shutting down services..."
    kill $DJANGO_PID 2>/dev/null || true
    kill $FASTAPI_PID 2>/dev/null || true
    kill $NGINX_PID 2>/dev/null || true
    exit 0
}

# Trap signals
trap shutdown SIGTERM SIGINT

# Wait for any process to exit
wait $NGINX_PID