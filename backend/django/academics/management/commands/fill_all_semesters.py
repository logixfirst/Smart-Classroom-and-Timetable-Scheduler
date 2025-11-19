import random
from datetime import date

from academics.models import Batch, Department, Organization, Program, Student, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Fill all departments with at least 50 students in each semester (1-8)"

    def handle(self, *args, **kwargs):
        try:
            self.stdout.write("Filling all semesters for all departments...")

            org = Organization.objects.first()
            if not org:
                self.stdout.write(self.style.ERROR("No organization found"))
                return

            departments = Department.objects.filter(organization=org, is_active=True)
            self.stdout.write(f"Processing {departments.count()} departments")

            total_created = 0

            for dept in departments:
                dept_created = 0

                # Check each semester and fill to minimum 50 students
                for semester in range(1, 9):
                    current_count = Student.objects.filter(
                        organization=org,
                        department=dept,
                        current_semester=semester,
                        is_active=True,
                    ).count()

                    needed = max(0, 50 - current_count)

                    if needed > 0:
                        # Determine admission year based on semester
                        admission_year = self.get_admission_year(semester)

                        created = self.create_students_for_dept_sem(
                            org, dept, semester, admission_year, needed
                        )
                        dept_created += created
                        total_created += created

                self.stdout.write(
                    f"{dept.dept_code:10}: Added {dept_created:3} students"
                )

            self.stdout.write(f"Total students created: {total_created}")

            # Show final summary
            self.show_summary(org)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))

    def get_admission_year(self, semester):
        """Calculate admission year based on current semester"""
        current_year = 2024
        years_back = (semester - 1) // 2
        return current_year - years_back

    def create_students_for_dept_sem(self, org, dept, semester, admission_year, count):
        """Create students for specific department and semester"""
        created = 0

        # Get existing count to continue numbering
        existing_count = Student.objects.filter(
            organization=org, department=dept, current_semester=semester
        ).count()

        start_num = existing_count + 1

        for i in range(start_num, start_num + count):
            try:
                # Generate unique identifiers
                roll_number = (
                    f"{admission_year}{dept.dept_code}S{semester}{str(i).zfill(3)}"
                )
                username = f"s{admission_year}{dept.dept_code.lower()}{semester}{i}"
                email = f"{username}@student.edu"

                # Skip if exists
                if Student.objects.filter(
                    organization=org, roll_number=roll_number
                ).exists():
                    continue
                if User.objects.filter(username=username).exists():
                    continue

                # Create user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=f"Student{i}",
                    last_name=f"S{semester}",
                    password="student123",
                    organization=org,
                    role="student",
                    is_active=True,
                )

                # Get or create program
                program, _ = Program.objects.get_or_create(
                    organization=org,
                    department=dept,
                    program_code=f"PROG-{dept.dept_code}",
                    defaults={
                        "school": dept.school,
                        "program_name": f"Program {dept.dept_name}",
                        "program_type": "ug" if semester <= 8 else "pg",
                        "duration_years": 4.0,
                        "total_semesters": 8,
                        "total_credits": 160,
                        "intake_capacity": 200,
                        "min_eligibility": "12th Pass",
                        "is_active": True,
                    },
                )

                # Get or create batch
                batch, _ = Batch.objects.get_or_create(
                    organization=org,
                    program=program,
                    department=dept,
                    year_of_admission=admission_year,
                    section="A",
                    defaults={
                        "batch_name": f"{dept.dept_name} {admission_year}",
                        "batch_code": f"{str(admission_year)[-2:]}{dept.dept_code}A",
                        "current_semester": semester,
                        "total_students": 200,
                        "is_active": True,
                    },
                )

                # Create student
                Student.objects.create(
                    user=user,
                    organization=org,
                    program=program,
                    department=dept,
                    batch=batch,
                    roll_number=roll_number,
                    student_name=f"Student{i} Sem{semester}",
                    email=email,
                    current_semester=semester,
                    current_year=((semester - 1) // 2) + 1,
                    date_of_admission=date(admission_year, 7, 15),
                    expected_graduation_year=admission_year + 4,
                    phone=f"+91{random.randint(7000000000, 9999999999)}",
                    is_active=True,
                    status="enrolled",
                )
                created += 1

            except Exception as e:
                continue

        return created

    def show_summary(self, org):
        """Show final summary of students per semester"""
        self.stdout.write("\nFinal Summary - Students per Semester:")
        self.stdout.write("=" * 50)

        for sem in range(1, 9):
            count = Student.objects.filter(
                organization=org, current_semester=sem, is_active=True
            ).count()
            self.stdout.write(f"Semester {sem}: {count:4} students")

        total = Student.objects.filter(organization=org, is_active=True).count()
        self.stdout.write(f"Total:      {total:4} students")
