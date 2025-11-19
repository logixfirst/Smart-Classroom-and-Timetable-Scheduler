from academics.models import Student, StudentElectiveChoice, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Simple bulk enrollment using existing StudentElectiveChoice model"

    def add_arguments(self, parser):
        parser.add_argument("--semester", type=int, default=1)
        parser.add_argument("--academic-year", type=str, default="2024-25")

    def handle(self, *args, **options):
        semester = options["semester"]
        academic_year = options["academic_year"]

        with transaction.atomic():
            stats = self.enroll_students_nep_compliant(semester, academic_year)

            self.stdout.write(self.style.SUCCESS("Enrollment completed:"))
            self.stdout.write(f'Students processed: {stats["students_processed"]}')
            self.stdout.write(f'Total enrollments: {stats["total_enrollments"]}')
            self.stdout.write(f'Core subjects: {stats["core_enrollments"]}')
            self.stdout.write(f'Elective subjects: {stats["elective_enrollments"]}')

    def enroll_students_nep_compliant(self, semester, academic_year):
        """Enroll students following NEP 2020 constraints"""
        students = Student.objects.filter(
            current_semester=semester, is_active=True
        ).select_related("department")

        stats = {
            "students_processed": 0,
            "total_enrollments": 0,
            "core_enrollments": 0,
            "elective_enrollments": 0,
        }

        self.stdout.write(
            f"Processing {students.count()} students for semester {semester}..."
        )

        for student in students:
            enrollments = self.enroll_single_student(student, semester, academic_year)

            stats["total_enrollments"] += enrollments["total"]
            stats["core_enrollments"] += enrollments["core"]
            stats["elective_enrollments"] += enrollments["elective"]
            stats["students_processed"] += 1

            if stats["students_processed"] % 100 == 0:
                self.stdout.write(f'Processed {stats["students_processed"]} students')

        return stats

    def enroll_single_student(self, student, semester, academic_year):
        """Enroll single student with NEP constraints"""
        enrollments = {"total": 0, "core": 0, "elective": 0}

        # Get current enrollments to check constraints
        current_enrollments = StudentElectiveChoice.objects.filter(
            student=student, semester=semester
        ).select_related("subject")

        current_credits = sum(e.subject.credits for e in current_enrollments)
        current_courses = current_enrollments.count()
        current_labs = sum(1 for e in current_enrollments if e.subject.requires_lab)

        # Core subjects (max 2-3 per semester)
        core_subjects = Subject.objects.filter(
            department=student.department,
            semester=semester,
            subject_type="core",
            is_active=True,
        )[
            :2
        ]  # Limit to 2 core subjects

        for subject in core_subjects:
            if self.can_enroll(
                student, subject, current_credits, current_courses, current_labs
            ):
                if self.create_enrollment(student, subject, semester, is_core=True):
                    enrollments["core"] += 1
                    enrollments["total"] += 1
                    current_credits += subject.credits
                    current_courses += 1
                    if subject.requires_lab:
                        current_labs += 1

        # Department electives (1 per semester)
        dept_electives = Subject.objects.filter(
            department=student.department, subject_type="elective", is_active=True
        )[:1]

        for subject in dept_electives:
            if self.can_enroll(
                student, subject, current_credits, current_courses, current_labs
            ):
                if self.create_enrollment(student, subject, semester):
                    enrollments["elective"] += 1
                    enrollments["total"] += 1
                    current_credits += subject.credits
                    current_courses += 1
                    if subject.requires_lab:
                        current_labs += 1

        # Open electives (1 per semester)
        open_electives = Subject.objects.filter(
            subject_type="open_elective", is_active=True
        ).exclude(department=student.department)[:1]

        for subject in open_electives:
            if self.can_enroll(
                student, subject, current_credits, current_courses, current_labs
            ):
                if self.create_enrollment(student, subject, semester):
                    enrollments["elective"] += 1
                    enrollments["total"] += 1
                    current_credits += subject.credits
                    current_courses += 1
                    if subject.requires_lab:
                        current_labs += 1

        # Skill courses (1 per semester)
        skill_courses = Subject.objects.filter(
            subject_type="ability_enhancement", is_active=True
        )[:1]

        for subject in skill_courses:
            if self.can_enroll(
                student, subject, current_credits, current_courses, current_labs
            ):
                if self.create_enrollment(student, subject, semester):
                    enrollments["elective"] += 1
                    enrollments["total"] += 1

        return enrollments

    def can_enroll(
        self, student, subject, current_credits, current_courses, current_labs
    ):
        """Check NEP 2020 enrollment constraints"""

        # Credit limits (14-26 per semester)
        if current_credits + subject.credits > 26:
            return False

        # Course limits (max 6 per semester)
        if current_courses >= 6:
            return False

        # Lab limits (max 2 per semester)
        if subject.requires_lab and current_labs >= 2:
            return False

        # Contact hours (max 30 per week)
        subject_hours = (
            subject.lecture_hours_per_week
            + subject.tutorial_hours_per_week
            + subject.practical_hours_per_week
        )
        if subject_hours > 6:  # Skip subjects with too many hours
            return False

        return True

    def create_enrollment(self, student, subject, semester, is_core=False):
        """Create enrollment record"""
        try:
            enrollment, created = StudentElectiveChoice.objects.get_or_create(
                student=student,
                subject=subject,
                semester=semester,
                defaults={
                    "organization": student.organization,
                    "choice_priority": 1,
                    "is_approved": True,  # Auto-approve for bulk enrollment
                },
            )
            return created
        except Exception as e:
            self.stdout.write(
                f"Error creating enrollment for {student.roll_number}: {e}"
            )
            return False
