import random
from datetime import date

from academics.models import Batch, Department, Organization, Program, Student, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Batch fill all departments with 50 students per odd semester"

    def handle(self, *args, **kwargs):
        org = Organization.objects.first()
        departments = Department.objects.filter(organization=org, is_active=True)

        self.stdout.write(f"Batch filling {departments.count()} departments...")

        total_created = 0

        for i, dept in enumerate(departments):
            try:
                created = self.fill_department(org, dept)
                total_created += created
                self.stdout.write(
                    f"{i+1:2}/{departments.count()}: {dept.dept_code} +{created}"
                )
            except Exception as e:
                self.stdout.write(f"Error {dept.dept_code}: {str(e)}")

        self.stdout.write(f"Total created: {total_created}")

    def fill_department(self, org, dept):
        created = 0
        odd_sems = [(1, 2024), (3, 2023), (5, 2022), (7, 2021)]

        for sem, year in odd_sems:
            current = Student.objects.filter(
                organization=org, department=dept, current_semester=sem
            ).count()

            needed = max(0, 50 - current)
            if needed == 0:
                continue

            # Get/create program and batch
            program, _ = Program.objects.get_or_create(
                organization=org,
                department=dept,
                program_code=f"P-{dept.dept_code}",
                defaults={
                    "school": dept.school,
                    "program_name": f"Program {dept.dept_name}",
                    "program_type": "ug",
                    "duration_years": 4.0,
                    "total_semesters": 8,
                    "total_credits": 160,
                    "intake_capacity": 200,
                    "min_eligibility": "12th",
                    "is_active": True,
                },
            )

            batch, _ = Batch.objects.get_or_create(
                organization=org,
                program=program,
                department=dept,
                year_of_admission=year,
                section="A",
                defaults={
                    "batch_name": f"{dept.dept_name} {year}",
                    "batch_code": f"{year}{dept.dept_code}A",
                    "current_semester": sem,
                    "total_students": 200,
                    "is_active": True,
                },
            )

            # Create students in batch
            for j in range(needed):
                try:
                    num = current + j + 1
                    roll = f"{year}{dept.dept_code}{num:04d}"
                    user = f"u{year}{dept.dept_code.lower()}{num}"

                    if Student.objects.filter(
                        organization=org, roll_number=roll
                    ).exists():
                        continue
                    if User.objects.filter(username=user).exists():
                        continue

                    u = User.objects.create_user(
                        username=user,
                        email=f"{user}@edu",
                        first_name=f"S{num}",
                        last_name=dept.dept_code,
                        password="pass123",
                        organization=org,
                        role="student",
                        is_active=True,
                    )

                    Student.objects.create(
                        user=u,
                        organization=org,
                        program=program,
                        department=dept,
                        batch=batch,
                        roll_number=roll,
                        student_name=f"S{num} {dept.dept_code}",
                        email=f"{user}@edu",
                        current_semester=sem,
                        current_year=((sem - 1) // 2) + 1,
                        date_of_admission=date(year, 7, 15),
                        expected_graduation_year=year + 4,
                        phone=f"+91{random.randint(7000000000, 9999999999)}",
                        is_active=True,
                        status="enrolled",
                    )
                    created += 1
                except Exception:
                    continue

        return created
