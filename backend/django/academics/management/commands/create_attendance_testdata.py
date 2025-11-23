"""
Management command to create test attendance data
Usage: python manage.py create_attendance_testdata
"""
import random
from datetime import datetime, timedelta

from academics.attendance_models import (
    AttendanceAlert,
    AttendanceRecord,
    AttendanceSession,
    SubjectEnrollment,
)
from academics.models import Batch, Course, Department, Faculty, Student, Subject, User
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Create test attendance data for development"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Creating test attendance data..."))

        # Get or create test users
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@sih28.com",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password("admin123")
        admin_user.save()

        # Get sample students (first 10)
        students = list(Student.objects.all()[:10])
        if not students:
            self.stdout.write(
                self.style.ERROR("No students found! Run import_csv_data first.")
            )
            return

        # Get sample faculty (first 3)
        faculties = list(Faculty.objects.all()[:3])
        if not faculties:
            self.stdout.write(
                self.style.ERROR("No faculty found! Run import_csv_data first.")
            )
            return

        # Get sample subjects (first 5)
        subjects = list(Subject.objects.all()[:5])
        if not subjects:
            self.stdout.write(
                self.style.ERROR("No subjects found! Run import_csv_data first.")
            )
            return

        # Get sample batch
        batch = Batch.objects.first()
        if not batch:
            self.stdout.write(
                self.style.ERROR("No batch found! Run import_csv_data first.")
            )
            return

        self.stdout.write(
            f"Found {len(students)} students, {len(faculties)} faculty, {len(subjects)} subjects"
        )

        # Create subject enrollments
        enrollment_count = 0
        current_year = timezone.now().year
        academic_year = f"{current_year}-{str(current_year+1)[-2:]}"

        for student in students:
            for subject in subjects[:3]:  # Enroll each student in 3 subjects
                enrollment, created = SubjectEnrollment.objects.get_or_create(
                    student=student,
                    subject=subject,
                    academic_year=academic_year,
                    semester=student.current_semester
                    if hasattr(student, "current_semester")
                    else 1,
                    defaults={"is_active": True, "batch": batch},
                )
                if created:
                    enrollment_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {enrollment_count} enrollments"))

        # Create attendance sessions (last 30 days)
        session_count = 0
        record_count = 0

        for days_ago in range(30, 0, -1):
            date = (timezone.now() - timedelta(days=days_ago)).date()

            # Skip weekends
            if date.weekday() >= 5:
                continue

            # Create 2-3 sessions per day for different subjects
            for subject in random.sample(subjects, min(3, len(subjects))):
                faculty = random.choice(faculties)

                # Random time slot
                hour = random.choice([9, 10, 11, 14, 15, 16])
                start_time = datetime.combine(date, datetime.min.time()).replace(
                    hour=hour
                )
                end_time = start_time + timedelta(hours=1)

                session, created = AttendanceSession.objects.get_or_create(
                    subject=subject,
                    faculty=faculty,
                    batch=batch,
                    date=date,
                    start_time=start_time.time(),
                    defaults={
                        "end_time": end_time.time(),
                        "session_type": random.choice(["lecture", "lab", "tutorial"]),
                        "is_marked": True,
                        "marked_at": timezone.make_aware(
                            start_time + timedelta(minutes=10)
                        ),
                        "notes": f"Room {random.randint(101, 505)}",
                    },
                )

                if created:
                    session_count += 1

                    # Create attendance records for enrolled students
                    enrolled_students = SubjectEnrollment.objects.filter(
                        subject=subject, is_active=True
                    ).values_list("student", flat=True)

                    for student_id in enrolled_students:
                        student = Student.objects.get(pk=student_id)

                        # Random attendance status (85% present, 10% absent, 5% late)
                        rand = random.random()
                        if rand < 0.85:
                            status = "present"
                        elif rand < 0.95:
                            status = "absent"
                        else:
                            status = "late"

                        record, record_created = AttendanceRecord.objects.get_or_create(
                            session=session,
                            student=student,
                            defaults={
                                "status": status,
                                "marked_at": session.marked_at,
                                "marked_by": faculty,
                            },
                        )

                        if record_created:
                            record_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {session_count} sessions"))
        self.stdout.write(
            self.style.SUCCESS(f"Created {record_count} attendance records")
        )

        # Create some low attendance alerts
        alert_count = 0
        for student in students[:5]:  # Alert for 5 students
            for subject in subjects[:2]:  # For 2 subjects each
                # Check if student has enrollment
                if SubjectEnrollment.objects.filter(
                    student=student, subject=subject
                ).exists():
                    # Calculate attendance percentage
                    records = AttendanceRecord.objects.filter(
                        student=student, session__subject=subject
                    )
                    total = records.count()
                    if total > 0:
                        present = records.filter(status__in=["present", "late"]).count()
                        percentage = present / total * 100

                        if percentage < 75:
                            alert, created = AttendanceAlert.objects.get_or_create(
                                student=student,
                                subject=subject,
                                alert_type="low_attendance",
                                defaults={
                                    "threshold_value": 75.0,
                                    "current_value": percentage,
                                    "message": f"Your attendance in {subject.subject_name} is {percentage:.1f}% (below 75%)",
                                    "severity": "high" if percentage < 60 else "medium",
                                    "is_read": False,
                                },
                            )
                            if created:
                                alert_count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {alert_count} alerts"))

        # Print test credentials
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("TEST CREDENTIALS:"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.WARNING("\nAdmin Login:"))
        self.stdout.write(f"  Email: admin@sih28.com")
        self.stdout.write(f"  Password: admin123")

        self.stdout.write(self.style.WARNING("\nStudent Login (pick any):"))
        for student in students[:3]:
            # Check if user exists for this student
            user = User.objects.filter(email=student.email).first()
            if user:
                self.stdout.write(f"  Email: {student.email} | Password: password123")
                self.stdout.write(
                    f"    Name: {student.name} | ID: {student.student_id}"
                )

        self.stdout.write(self.style.WARNING("\nFaculty Login (pick any):"))
        for faculty in faculties[:2]:
            # Check if user exists for this faculty
            user = User.objects.filter(email=faculty.email).first()
            if user:
                self.stdout.write(f"  Email: {faculty.email} | Password: password123")
                self.stdout.write(
                    f"    Name: {faculty.name} | ID: {faculty.faculty_id}"
                )

        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("✓ Test data created successfully!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
