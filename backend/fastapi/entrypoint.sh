#!/bin/bash
set -e

# Wait for Redis to be ready
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis started"

# Start FastAPI server
echo "Starting FastAPI server..."
exec "$@"