from academics.enrollment_models import EnrollmentConstraints, StudentEnrollment
from academics.models import Organization, Student, Subject
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create NEP 2020 compliant student enrollments with constraints validation"

    def add_arguments(self, parser):
        parser.add_argument(
            "--semester", type=int, default=1, help="Semester to enroll (1-8)"
        )
        parser.add_argument(
            "--academic-year", type=str, default="2024-25", help="Academic year"
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Show what would be created"
        )

    def handle(self, *args, **options):
        semester = options["semester"]
        academic_year = options["academic_year"]
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN MODE - No enrollments will be created")
            )

        # Create default constraints for all organizations
        self.create_default_constraints()

        # Enroll students with NEP constraints
        with transaction.atomic():
            stats = self.enroll_students_nep_compliant(semester, academic_year, dry_run)

            if dry_run:
                transaction.set_rollback(True)
                self.stdout.write(self.style.SUCCESS("DRY RUN COMPLETE"))
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created {stats["total_enrollments"]} enrollments'
                    )
                )
                self.stdout.write(f'Students enrolled: {stats["students_enrolled"]}')
                self.stdout.write(f'Core enrollments: {stats["core_enrollments"]}')
                self.stdout.write(
                    f'Elective enrollments: {stats["elective_enrollments"]}'
                )

    def create_default_constraints(self):
        """Create default NEP 2020 constraints for organizations"""
        for org in Organization.objects.all():
            constraints, created = EnrollmentConstraints.objects.get_or_create(
                organization=org,
                defaults={
                    "min_credits_per_semester": 14,
                    "max_credits_regular_load": 22,
                    "max_credits_heavy_load": 26,
                    "min_courses_per_semester": 3,
                    "max_courses_per_semester": 6,
                    "max_lab_courses_per_semester": 2,
                    "max_contact_hours_per_week": 30,
                    "max_core_per_semester": 3,
                    "max_dept_electives_per_semester": 2,
                    "max_open_electives_per_semester": 2,
                },
            )
            if created:
                self.stdout.write(f"Created constraints for {org.org_code}")

    def enroll_students_nep_compliant(self, semester, academic_year, dry_run):
        """Enroll students following NEP 2020 constraints"""
        stats = {
            "total_enrollments": 0,
            "students_enrolled": 0,
            "core_enrollments": 0,
            "elective_enrollments": 0,
            "validation_errors": 0,
        }

        students = Student.objects.filter(current_semester=semester, is_active=True)
        self.stdout.write(
            f"Processing {students.count()} students for semester {semester}"
        )

        for student in students:
            try:
                student_enrollments = self.create_student_enrollments(
                    student, semester, academic_year, dry_run
                )
                stats["total_enrollments"] += student_enrollments["total"]
                stats["core_enrollments"] += student_enrollments["core"]
                stats["elective_enrollments"] += student_enrollments["elective"]

                if student_enrollments["total"] > 0:
                    stats["students_enrolled"] += 1

            except Exception as e:
                stats["validation_errors"] += 1
                self.stdout.write(f"Error enrolling {student.roll_number}: {str(e)}")

        return stats

    def create_student_enrollments(self, student, semester, academic_year, dry_run):
        """Create enrollments for a single student following NEP constraints"""
        enrollments = {"total": 0, "core": 0, "elective": 0}

        # Get subjects for student's department and semester
        core_subjects = Subject.objects.filter(
            department=student.department,
            semester=semester,
            subject_type="core",
            is_active=True,
        )[
            :2
        ]  # Max 2 core subjects per NEP

        dept_electives = Subject.objects.filter(
            department=student.department, subject_type="elective", is_active=True
        )[
            :1
        ]  # 1 department elective

        open_electives = Subject.objects.filter(
            subject_type="open_elective", is_active=True
        ).exclude(department=student.department)[
            :1
        ]  # 1 open elective

        skill_courses = Subject.objects.filter(
            subject_type="ability_enhancement", is_active=True
        )[
            :1
        ]  # 1 skill course

        # Enroll in core subjects
        for subject in core_subjects:
            if self.create_enrollment(
                student, subject, semester, academic_year, is_core=True, dry_run=dry_run
            ):
                enrollments["core"] += 1
                enrollments["total"] += 1

        # Enroll in electives
        for subject in dept_electives:
            if self.create_enrollment(
                student,
                subject,
                semester,
                academic_year,
                is_dept_elective=True,
                dry_run=dry_run,
            ):
                enrollments["elective"] += 1
                enrollments["total"] += 1

        for subject in open_electives:
            if self.create_enrollment(
                student,
                subject,
                semester,
                academic_year,
                is_open_elective=True,
                dry_run=dry_run,
            ):
                enrollments["elective"] += 1
                enrollments["total"] += 1

        for subject in skill_courses:
            if self.create_enrollment(
                student,
                subject,
                semester,
                academic_year,
                is_skill=True,
                dry_run=dry_run,
            ):
                enrollments["elective"] += 1
                enrollments["total"] += 1

        return enrollments

    def create_enrollment(
        self,
        student,
        subject,
        semester,
        academic_year,
        is_core=False,
        is_dept_elective=False,
        is_open_elective=False,
        is_skill=False,
        dry_run=False,
    ):
        """Create a single enrollment with validation"""
        try:
            enrollment = StudentEnrollment(
                organization=student.organization,
                student=student,
                subject=subject,
                academic_year=academic_year,
                semester=semester,
                is_core_subject=is_core,
                is_department_elective=is_dept_elective,
                is_open_elective=is_open_elective,
                is_skill_course=is_skill,
                load_type="regular",
            )

            # Validate constraints
            enrollment.clean()

            if not dry_run:
                enrollment.save()

            return True

        except ValidationError as e:
            self.stdout.write(
                f"Validation error for {student.roll_number} + {subject.subject_code}: {e}"
            )
            return False
        except Exception as e:
            self.stdout.write(f"Error creating enrollment: {e}")
            return False
