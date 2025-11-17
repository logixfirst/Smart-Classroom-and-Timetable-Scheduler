"""
Pytest configuration and fixtures for Django tests
"""
import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from faker import Faker
from rest_framework.test import APIClient

User = get_user_model()
fake = Faker()


@pytest.fixture(scope="session")
def django_db_setup():
    """Configure test database"""
    settings.DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "ATOMIC_REQUESTS": True,
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
def organization(db):
    """Create test organization"""
    from datetime import date

    from academics.models import Organization

    return Organization.objects.create(
        org_code="TEST",
        org_name="Test University",
        short_name="TU",
        institute_type="state_university",
        address="123 Test St",
        city="Test City",
        state="Test State",
        pincode="123456",
        contact_email="test@test.edu",
        contact_phone="1234567890",
        subscription_start_date=date.today(),
        subscription_end_date=date(2025, 12, 31),
        current_academic_year="2024-25",
    )


@pytest.fixture
def campus(db, organization):
    """Create test campus"""
    from academics.models import Campus

    return Campus.objects.create(
        organization=organization,
        campus_code="MAIN",
        campus_name="Main Campus",
        address="123 Campus Rd",
        city="Test City",
        is_main_campus=True,
    )


@pytest.fixture
def school(db, organization, campus):
    """Create test school"""
    from academics.models import School

    return School.objects.create(
        organization=organization,
        campus=campus,
        school_code="SCI",
        school_name="School of Science",
    )


@pytest.fixture
def department(db, organization, school):
    """Create test department"""
    from academics.models import Department

    return Department.objects.create(
        organization=organization,
        school=school,
        dept_code="CSE",
        dept_name="Computer Science",
        hod_name="Dr. Test",
        hod_email="hod@test.edu",
    )


@pytest.fixture
def program(db, organization, school, department):
    """Create test program"""
    from academics.models import Program

    return Program.objects.create(
        organization=organization,
        school=school,
        department=department,
        program_code="BTECH-CSE",
        program_name="BTech Computer Science",
        program_type="ug",
        duration_years=4.0,
        total_semesters=8,
        total_credits=160,
        intake_capacity=60,
        min_eligibility="12th with PCM",
    )


@pytest.fixture
def subject(db, organization, program, department):
    """Create test subject"""
    from academics.models import Subject

    return Subject.objects.create(
        organization=organization,
        program=program,
        department=department,
        subject_code="CS101",
        subject_name="Data Structures",
        subject_type="core",
        credits=4,
        lecture_hours_per_week=3,
        practical_hours_per_week=2,
        semester=3,
    )


@pytest.fixture
def faculty(db, organization, department):
    """Create test faculty"""
    from academics.models import Faculty

    return Faculty.objects.create(
        organization=organization,
        employee_id="FAC001",
        faculty_name="Dr. John Doe",
        email="faculty@test.edu",
        phone="1234567890",
        department=department,
        designation="assistant_professor",
        specialization="Testing",
    )


@pytest.fixture
def classroom(db, organization, campus, department):
    """Create test classroom"""
    from academics.models import Classroom

    return Classroom.objects.create(
        organization=organization,
        campus=campus,
        department=department,
        classroom_code="LH-101",
        building_name="Main Building",
        floor_number=1,
        room_type="lecture_hall",
        seating_capacity=60,
    )


@pytest.fixture
def batch(db, organization, program, department):
    """Create test batch"""
    from academics.models import Batch

    return Batch.objects.create(
        organization=organization,
        program=program,
        department=department,
        batch_name="BTech CSE 2024 Batch",
        batch_code="2024-CSE-A",
        year_of_admission=2024,
        current_semester=1,
        total_students=60,
    )


@pytest.fixture
def student(db, organization, program, batch, department):
    """Create test student"""
    from academics.models import Student

    return Student.objects.create(
        organization=organization,
        program=program,
        department=department,
        batch=batch,
        enrollment_number="2024CSE001",
        student_name="Test Student",
        email="student@test.edu",
        phone="9876543210",
        current_semester=1,
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
