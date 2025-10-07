#!/bin/bash

# Database Initialization Script for SIH28 Timetable Management System
# This script initializes the PostgreSQL database with required data

set -e

echo "🚀 Starting database initialization..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
python << EOF
import psycopg2
import time
import os

def wait_for_db():
    while True:
        try:
            conn = psycopg2.connect(
                host=os.environ['DB_HOST'],
                port=os.environ['DB_PORT'],
                user=os.environ['DB_USER'],
                password=os.environ['DB_PASSWORD'],
                dbname=os.environ['DB_NAME']
            )
            conn.close()
            print("✅ Database connection successful!")
            break
        except psycopg2.OperationalError:
            print("⏳ Database not ready, waiting...")
            time.sleep(2)

wait_for_db()
EOF

# Run Django migrations
echo "📊 Running Django migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser if it doesn't exist
echo "👤 Creating superuser..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@sih28.com',
        password='admin123'
    )
    print("✅ Superuser created: admin/admin123")
else:
    print("ℹ️  Superuser already exists")
EOF

# Load initial data if CSV files exist
echo "📥 Loading initial data..."

# Function to load CSV data
load_csv_data() {
    local model_name=$1
    local csv_file=$2
    
    if [ -f "/app/data/$csv_file" ]; then
        echo "📊 Loading $model_name data from $csv_file..."
        python manage.py shell << EOF
import pandas as pd
from apps.core.models import $model_name
import os

csv_path = "/app/data/$csv_file"
if os.path.exists(csv_path):
    df = pd.read_csv(csv_path)
    
    for _, row in df.iterrows():
        try:
            # This is a generic approach - you might need to customize based on your models
            obj_data = row.to_dict()
            obj, created = $model_name.objects.get_or_create(**obj_data)
            if created:
                print(f"✅ Created {obj}")
        except Exception as e:
            print(f"❌ Error creating $model_name: {e}")
            
    print(f"✅ Finished loading $model_name data")
else:
    print(f"⚠️  CSV file $csv_file not found")
EOF
    else
        echo "⚠️  CSV file $csv_file not found in /app/data/"
    fi
}

# Load data in order (considering dependencies)
load_csv_data "Department" "departments.csv"
load_csv_data "Course" "courses.csv"
load_csv_data "Subject" "subjects.csv"
load_csv_data "Classroom" "classrooms.csv"
load_csv_data "Lab" "labs.csv"
load_csv_data "Faculty" "faculty_100.csv"
load_csv_data "Batch" "batches.csv"
load_csv_data "Student" "students_5000.csv"

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo "🎉 Database initialization completed successfully!"
echo ""
echo "📋 Initial Setup Summary:"
echo "   • Django migrations: ✅"
echo "   • Superuser created: admin/admin123"
echo "   • Initial data loaded: ✅"
echo "   • Static files collected: ✅"
echo ""
echo "🌐 Access the application at:"
echo "   • Frontend: http://localhost"
echo "   • Django Admin: http://localhost/admin"
echo "   • API Documentation: http://localhost/api/docs"
echo ""