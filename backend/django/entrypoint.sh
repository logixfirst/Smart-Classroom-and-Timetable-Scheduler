#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for PostgreSQL..."
while ! nc -z $DB_HOST 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Wait for Redis to be ready
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis started"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Create superuser if it doesn't exist
echo "Creating superuser if needed..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@admin.com', 'admin')
    print('Superuser created')
else:
    print('Superuser already exists')
" || true

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server
echo "Starting Django server..."
exec "$@"