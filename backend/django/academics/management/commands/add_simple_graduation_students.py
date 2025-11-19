import random
from datetime import date

from academics.models import Batch, Department, Organization, Program, Student, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Add graduation students to semester 5 and 7 - simplified version"

    def handle(self, *args, **kwargs):
        try:
            self.stdout.write("Adding Graduation Students...")

            org = Organization.objects.first()
            if not org:
                self.stdout.write(self.style.ERROR("No organization found"))
                return

            # Get first 10 departments for testing
            departments = Department.objects.filter(organization=org, is_active=True)[
                :10
            ]

            if not departments.exists():
                self.stdout.write(self.style.ERROR("No departments found"))
                return

            self.stdout.write(f"Using {departments.count()} departments")

            total_created = 0

            # Create 100 students per department for semester 5
            for dept in departments:
                created = self.create_students_simple(org, dept, 5, 2023, 100)
                total_created += created
                self.stdout.write(
                    f"  {dept.dept_code}: Created {created} semester 5 students"
                )

            # Create 100 students per department for semester 7
            for dept in departments:
                created = self.create_students_simple(org, dept, 7, 2022, 100)
                total_created += created
                self.stdout.write(
                    f"  {dept.dept_code}: Created {created} semester 7 students"
                )

            self.stdout.write(f"Total students created: {total_created}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))

    def create_students_simple(self, org, dept, semester, admission_year, count):
        """Simplified student creation"""
        created = 0

        # Get existing student count for this dept/semester to avoid duplicates
        existing_count = Student.objects.filter(
            organization=org, department=dept, current_semester=semester
        ).count()

        start_num = existing_count + 1

        for i in range(start_num, start_num + count):
            try:
                # Simple unique identifiers
                roll_number = f"{admission_year}{dept.dept_code}{str(i).zfill(4)}"
                username = f"student{admission_year}{dept.dept_code.lower()}{i}"
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
                    last_name=dept.dept_code,
                    password="student123",
                    organization=org,
                    role="student",
                    is_active=True,
                )

                # Get or create program
                program, _ = Program.objects.get_or_create(
                    organization=org,
                    department=dept,
                    program_code=f"BTECH-{dept.dept_code}",
                    defaults={
                        "school": dept.school,
                        "program_name": f"B.Tech {dept.dept_name}",
                        "program_type": "ug",
                        "duration_years": 4.0,
                        "total_semesters": 8,
                        "total_credits": 160,
                        "intake_capacity": 120,
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
                        "batch_name": f"B.Tech {dept.dept_name} {admission_year}",
                        "batch_code": f"{str(admission_year)[-2:]}{dept.dept_code}A",
                        "current_semester": semester,
                        "total_students": count,
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
                    student_name=f"Student{i} {dept.dept_code}",
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
                self.stdout.write(f"    Error creating student {i}: {str(e)}")
                continue

        return created
