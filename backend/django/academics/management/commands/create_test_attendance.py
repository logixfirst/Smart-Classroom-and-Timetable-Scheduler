"""
Create test attendance data for demonstration
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from academics.models import Student, Faculty, Subject, Batch
from academics.attendance_models import (
    AttendanceSession,
    AttendanceRecord,
    SubjectEnrollment
)


class Command(BaseCommand):
    help = 'Create test attendance data'

    def handle(self, *args, **options):
        self.stdout.write('Creating test attendance data...')

        # Get some students, faculty, subjects, and batches
        students = list(Student.objects.all()[:30])
        faculty = list(Faculty.objects.all()[:5])
        subjects = list(Subject.objects.all()[:5])
        batches = list(Batch.objects.all()[:3])

        if not students or not faculty or not subjects or not batches:
            self.stdout.write(self.style.ERROR(
                'Please ensure you have students, faculty, subjects, and batches in the database'
            ))
            return

        self.stdout.write(f'Found {len(students)} students, {len(faculty)} faculty, '
                         f'{len(subjects)} subjects, {len(batches)} batches')

        # Create subject enrollments
        enrollment_count = 0
        for student in students:
            # Enroll each student in 3-5 random subjects
            student_subjects = random.sample(subjects, min(random.randint(3, 5), len(subjects)))
            for subject in student_subjects:
                SubjectEnrollment.objects.get_or_create(
                    student=student,
                    subject=subject,
                    defaults={
                        'enrollment_date': timezone.now().date(),
                        'is_active': True
                    }
                )
                enrollment_count += 1

        self.stdout.write(self.style.SUCCESS(f'Created {enrollment_count} enrollments'))

        # Create attendance sessions for the past 30 days
        session_count = 0
        record_count = 0

        for days_ago in range(30, 0, -1):
            session_date = timezone.now().date() - timedelta(days=days_ago)
            
            # Skip weekends
            if session_date.weekday() >= 5:
                continue

            # Create 2-4 sessions per day
            for _ in range(random.randint(2, 4)):
                subject = random.choice(subjects)
                faculty_member = random.choice(faculty)
                batch = random.choice(batches)

                # Create session
                session = AttendanceSession.objects.create(
                    subject=subject,
                    faculty=faculty_member,
                    batch=batch,
                    date=session_date,
                    time_slot=random.choice(['09:00-10:00', '10:00-11:00', '11:00-12:00', 
                                            '14:00-15:00', '15:00-16:00']),
                    session_type='lecture',
                    is_marked=True,
                    marked_at=timezone.now()
                )
                session_count += 1

                # Get students enrolled in this subject
                enrolled_students = SubjectEnrollment.objects.filter(
                    subject=subject,
                    is_active=True
                ).values_list('student', flat=True)

                enrolled_student_objs = Student.objects.filter(student_id__in=enrolled_students)

                # Mark attendance for each enrolled student
                for student in enrolled_student_objs:
                    # 85% present, 10% absent, 3% late, 2% excused
                    rand = random.random()
                    if rand < 0.85:
                        status = 'present'
                    elif rand < 0.95:
                        status = 'absent'
                    elif rand < 0.98:
                        status = 'late'
                    else:
                        status = 'excused'

                    AttendanceRecord.objects.create(
                        session=session,
                        student=student,
                        status=status,
                        marked_by=faculty_member,
                        marked_at=timezone.now(),
                        verification_method='manual'
                    )
                    record_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Created {session_count} sessions and {record_count} attendance records'
        ))
        self.stdout.write(self.style.SUCCESS('Test attendance data created successfully!'))
