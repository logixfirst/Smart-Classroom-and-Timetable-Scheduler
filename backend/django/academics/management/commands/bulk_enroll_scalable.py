from academics.models import Student, Subject
from academics.scalable_enrollment import StudentSubjectEnrollment
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Bulk enroll students using scalable ManyToMany approach"

    def add_arguments(self, parser):
        parser.add_argument("--semester", type=int, default=1)
        parser.add_argument("--academic-year", type=str, default="2024-25")

    def handle(self, *args, **options):
        semester = options["semester"]
        academic_year = options["academic_year"]

        with transaction.atomic():
            stats = self.bulk_enroll_students(semester, academic_year)

            self.stdout.write(self.style.SUCCESS("Enrollment completed:"))
            self.stdout.write(f'Students processed: {stats["students_processed"]}')
            self.stdout.write(f'Total enrollments: {stats["total_enrollments"]}')
            self.stdout.write(f'Average per student: {stats["avg_per_student"]:.1f}')

    def bulk_enroll_students(self, semester, academic_year):
        """Bulk enroll all students for semester"""
        students = Student.objects.filter(
            current_semester=semester, is_active=True
        ).select_related("department")

        stats = {"students_processed": 0, "total_enrollments": 0, "avg_per_student": 0}

        self.stdout.write(f"Processing {students.count()} students...")

        for student in students:
            enrolled_count = self.enroll_student_optimized(
                student, semester, academic_year
            )
            stats["total_enrollments"] += enrolled_count
            stats["students_processed"] += 1

            if stats["students_processed"] % 100 == 0:
                self.stdout.write(f'Processed {stats["students_processed"]} students')

        if stats["students_processed"] > 0:
            stats["avg_per_student"] = (
                stats["total_enrollments"] / stats["students_processed"]
            )

        return stats

    def enroll_student_optimized(self, student, semester, academic_year):
        """Optimized enrollment for single student"""
        enrolled_count = 0

        # Get subjects for student's department and semester
        subjects = Subject.objects.filter(
            department=student.department, semester=semester, is_active=True
        ).order_by("subject_type", "credits")

        current_credits = 0
        current_courses = 0
        lab_courses = 0

        # NEP 2020 compliant enrollment
        for subject in subjects:
            # Check constraints
            if current_courses >= 6:  # Max courses
                break

            if current_credits + subject.credits > 26:  # Max credits
                continue

            if subject.requires_lab and lab_courses >= 2:  # Max labs
                continue

            # Subject type constraints
            if (
                subject.subject_type == "core"
                and self.get_type_count(student, semester, academic_year, "core") >= 3
            ):
                continue

            if (
                subject.subject_type == "elective"
                and self.get_type_count(student, semester, academic_year, "elective")
                >= 2
            ):
                continue

            # Create enrollment
            enrollment, created = StudentSubjectEnrollment.objects.get_or_create(
                student=student,
                subject=subject,
                academic_year=academic_year,
                defaults={"semester": semester},
            )

            if created:
                enrolled_count += 1
                current_credits += subject.credits
                current_courses += 1

                if subject.requires_lab:
                    lab_courses += 1

            # Stop if optimal load reached
            if current_credits >= 18 and current_courses >= 4:
                break

        return enrolled_count

    def get_type_count(self, student, semester, academic_year, subject_type):
        """Get count of subjects by type for student in semester"""
        return StudentSubjectEnrollment.objects.filter(
            student=student,
            semester=semester,
            academic_year=academic_year,
            subject__subject_type=subject_type,
            status="enrolled",
        ).count()
