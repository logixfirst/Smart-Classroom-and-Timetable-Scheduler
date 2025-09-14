import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.users.models import User, Faculty, Batch
from apps.courses.models import Course
from apps.classrooms.models import Classroom

# Create users and faculty
users_data = [
    {'username': 'rahul', 'first_name': 'RAHUL', 'last_name': 'SHARMA'},
    {'username': 'harshita', 'first_name': 'HARSHITA', 'last_name': 'BHARDWAJ'},
    {'username': 'pramod', 'first_name': 'PRAMOD', 'last_name': 'SAGAR'}
]

for i, user_data in enumerate(users_data, 1):
    user, created = User.objects.get_or_create(username=user_data['username'], defaults=user_data)
    Faculty.objects.get_or_create(user=user, defaults={'employee_id': f'F00{i}'})

# Create batches
batches_data = [
    {'name': 'A', 'strength': 30},
    {'name': 'B', 'strength': 32},
    {'name': 'C', 'strength': 28},
    {'name': 'D', 'strength': 35}
]

for batch_data in batches_data:
    Batch.objects.get_or_create(
        name=batch_data['name'], 
        department='cs', 
        semester='1',
        defaults={**batch_data, 'academic_year': '2023-24'}
    )

# Create courses
courses_data = [
    {'code': 'DS', 'name': 'Data Structures', 'classes_per_week': 5},
    {'code': 'DM', 'name': 'Discrete Mathematics', 'classes_per_week': 5},
    {'code': 'COA', 'name': 'Computer Organization', 'classes_per_week': 5}
]

for course_data in courses_data:
    Course.objects.get_or_create(
        code=course_data['code'],
        defaults={**course_data, 'department': 'cs', 'semester': '1'}
    )

# Create classrooms
classrooms_data = [
    {'room_number': 'BG1', 'capacity': 40},
    {'room_number': 'BG2', 'capacity': 40},
    {'room_number': 'BG3', 'capacity': 40},
    {'room_number': 'BG4', 'capacity': 40}
]

for classroom_data in classrooms_data:
    Classroom.objects.get_or_create(
        room_number=classroom_data['room_number'],
        defaults={**classroom_data, 'room_type': 'lecture'}
    )

print("Sample data created successfully!")