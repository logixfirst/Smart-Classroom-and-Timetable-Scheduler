"""Create simple test attendance data"""
import random
from datetime import timedelta

from academics.attendance_models import (
    AttendanceRecord,
    AttendanceSession,
    SubjectEnrollment,
)
from academics.models import Faculty, Student, Subject
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Create simple test attendance data"

    def handle(self, *args, **options):
        self.stdout.write("Creating simple test data...")

        # Get first 5 students
        students = list(Student.objects.all()[:5])
        if not students:
            self.stdout.write(self.style.ERROR("No students found"))
            return

        # Get first faculty
        faculty = Faculty.objects.first()
        if not faculty:
            self.stdout.write(self.style.ERROR("No faculty found"))
            return

        # Get first subject
        subject = Subject.objects.first()
        if not subject:
            self.stdout.write(self.style.ERROR("No subjects found"))
            return

        self.stdout.write(
            f"Using: {len(students)} students, Faculty: {faculty.faculty_name}, Subject: {subject.subject_name}"
        )

        # Create enrollments
        for student in students:
            SubjectEnrollment.objects.get_or_create(
                student=student,
                subject=subject,
                academic_year="2025-26",
                semester=1,
                defaults={"is_active": True},
            )

        self.stdout.write(f"✓ Created enrollments")

        # Get a batch
        from academics.models import Batch

        batch = Batch.objects.first()
        if not batch:
            self.stdout.write(self.style.ERROR("No batch found"))
            return

        # Create 3 attendance sessions (today, yesterday, 2 days ago)
        session_count = 0
        record_count = 0

        for days_ago in [0, 1, 2]:
            date = (timezone.now() - timedelta(days=days_ago)).date()

            session, created = AttendanceSession.objects.get_or_create(
                subject=subject,
                faculty=faculty,
                batch=batch,
                date=date,
                start_time="10:00",
                defaults={
                    "end_time": "11:00",
                    "session_type": "lecture",
                    "is_marked": True,
                    "marked_at": timezone.now(),
                },
            )

            if created:
                session_count += 1

            # Create attendance records for each student
            for student in students:
                status = random.choice(
                    ["present", "present", "present", "absent"]
                )  # 75% present

                record, rec_created = AttendanceRecord.objects.get_or_create(
                    session=session,
                    student=student,
                    defaults={
                        "status": status,
                        "marked_by": faculty,
                        "marked_at": timezone.now(),
                    },
                )

                if rec_created:
                    record_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Created {session_count} sessions and {record_count} records"
            )
        )
        self.stdout.write(self.style.SUCCESS("Done!"))
