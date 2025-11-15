"""
Pytest configuration and fixtures for Django tests
"""
import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from faker import Faker

User = get_user_model()
fake = Faker()


@pytest.fixture(scope="session")
def django_db_setup():
    """Configure test database"""
    settings.DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "test_sih28",
        "USER": "postgres",
        "PASSWORD": "postgres",
        "HOST": "localhost",
        "PORT": "5432",
        "ATOMIC_REQUESTS": True,
        "CONN_MAX_AGE": 600,
    }
    # Use faster password hasher for testing
    settings.PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]


@pytest.fixture
def api_client():
    """Return API client for testing"""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create admin user for testing"""
    return User.objects.create_user(
        username="admin_test",
        email="admin@test.com",
        password="testpass123",
        role="admin",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def staff_user(db):
    """Create staff user for testing"""
    return User.objects.create_user(
        username="staff_test",
        email="staff@test.com",
        password="testpass123",
        role="staff",
    )


@pytest.fixture
def faculty_user(db):
    """Create faculty user for testing"""
    return User.objects.create_user(
        username="faculty_test",
        email="faculty@test.com",
        password="testpass123",
        role="faculty",
        department="CSE",
    )


@pytest.fixture
def student_user(db):
    """Create student user for testing"""
    return User.objects.create_user(
        username="student_test",
        email="student@test.com",
        password="testpass123",
        role="student",
    )


@pytest.fixture
def authenticated_client(api_client, admin_user):
    """Return authenticated API client"""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def department(db):
    """Create test department"""
    from academics.models import Department

    return Department.objects.create(
        department_id="TEST",
        department_name="Test Department",
        building_name="Test Building",
        head_of_department="Dr. Test",
    )


@pytest.fixture
def course(db):
    """Create test course"""
    from academics.models import Course

    return Course.objects.create(
        course_id="TEST101", course_name="Test Course", duration_years=4, level="UG"
    )


@pytest.fixture
def subject(db, course, department):
    """Create test subject"""
    from academics.models import Subject

    return Subject.objects.create(
        subject_id="SUB001",
        subject_name="Test Subject",
        course=course,
        department=department,
        faculty_assigned="FAC001",
        credits=3,
    )


@pytest.fixture
def faculty(db, department):
    """Create test faculty"""
    from academics.models import Faculty

    return Faculty.objects.create(
        faculty_id="FAC001",
        faculty_name="Test Faculty",
        designation="Professor",
        department=department,
        specialization="Testing",
        max_workload_per_week=20,
        email="faculty@test.com",
        phone="1234567890",
    )


@pytest.fixture
def classroom(db, department):
    """Create test classroom"""
    from academics.models import Classroom

    return Classroom.objects.create(
        room_id="ROOM001",
        department=department,
        room_number="R101",
        capacity=50,
        room_type="lecture hall",
    )


@pytest.fixture
def batch(db, course, department):
    """Create test batch"""
    from academics.models import Batch

    return Batch.objects.create(
        batch_id="BATCH2024",
        course=course,
        department=department,
        year=1,
        semester=1,
        no_of_students=50,
    )


@pytest.fixture
def student(db, course, department, batch):
    """Create test student"""
    from academics.models import Student

    return Student.objects.create(
        student_id="STU001",
        name="Test Student",
        department=department,
        course=course,
        electives="CS101,CS102",
        year=1,
        semester=1,
        email="student@test.com",
        phone="9876543210",
    )


@pytest.fixture
def sample_timetable_data():
    """Return sample timetable generation data"""
    return {
        "department_id": "TEST",
        "batch_id": "BATCH001",
        "semester": 1,
        "academic_year": "2024-25",
    }


# Markers for test organization
def pytest_configure(config):
    """Register custom markers"""
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "unit: mark test as unit test")
    config.addinivalue_line("markers", "security: mark test as security test")
