import random
from datetime import date

from academics.models import Batch, Department, Organization, Program, Student, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Fill all departments with at least 50 students in odd semesters (1, 3, 5, 7)"
    )

    def handle(self, *args, **kwargs):
        try:
            self.stdout.write(
                "Filling odd semesters (1, 3, 5, 7) for all departments..."
            )

            org = Organization.objects.first()
            if not org:
                self.stdout.write(self.style.ERROR("No organization found"))
                return

            departments = Department.objects.filter(organization=org, is_active=True)
            self.stdout.write(f"Processing {departments.count()} departments")

            total_created = 0
            odd_semesters = [1, 3, 5, 7]

            for dept in departments:
                dept_created = 0
                sem_status = []

                # Check each odd semester and fill to minimum 50 students
                for semester in odd_semesters:
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
                        sem_status.append(f"S{semester}:+{created}")
                    else:
                        sem_status.append(f"S{semester}:✓")

                status_str = " | ".join(sem_status)
                self.stdout.write(
                    f"{dept.dept_code:10}: {status_str} (Total added: {dept_created})"
                )

            self.stdout.write(f"\nTotal students created: {total_created}")

            # Show final summary
            self.show_summary(org)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))

    def get_admission_year(self, semester):
        """Calculate admission year based on current semester"""
        current_year = 2024
        if semester == 1:
            return 2024  # Current year admission
        elif semester == 3:
            return 2023  # Previous year admission
        elif semester == 5:
            return 2022  # 2 years back
        elif semester == 7:
            return 2021  # 3 years back
        return current_year

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
                roll_number = f"{admission_year}{dept.dept_code}{str(i).zfill(4)}"
                username = f"std{admission_year}{dept.dept_code.lower()}{i}"
                email = f"{username}@student.edu"

                # Skip if exists
                if Student.objects.filter(
                    organization=org, roll_number=roll_number
                ).exists():
                    # Try with different numbering
                    roll_number = f"{admission_year}{dept.dept_code}X{str(i).zfill(3)}"
                    if Student.objects.filter(
                        organization=org, roll_number=roll_number
                    ).exists():
                        continue

                if User.objects.filter(username=username).exists():
                    username = f"std{admission_year}{dept.dept_code.lower()}x{i}"
                    email = f"{username}@student.edu"
                    if User.objects.filter(username=username).exists():
                        continue

                # Create user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=self.get_random_name(),
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
                    program_code=f"PROG-{dept.dept_code}",
                    defaults={
                        "school": dept.school,
                        "program_name": f"Program {dept.dept_name}",
                        "program_type": "ug",
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
                    student_name=f"{user.first_name} {user.last_name}",
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

    def get_random_name(self):
        """Get random Indian first name"""
        names = [
            "Aarav",
            "Vivaan",
            "Aditya",
            "Arjun",
            "Sai",
            "Arnav",
            "Ayaan",
            "Krishna",
            "Ishaan",
            "Ananya",
            "Diya",
            "Aarohi",
            "Pari",
            "Navya",
            "Saanvi",
            "Angel",
            "Pihu",
            "Myra",
            "Rahul",
            "Rohan",
            "Karan",
            "Varun",
            "Nikhil",
            "Amit",
            "Suresh",
            "Vikram",
            "Ajay",
            "Priya",
            "Sneha",
            "Pooja",
            "Neha",
            "Divya",
            "Anjali",
            "Kavya",
            "Shreya",
            "Riya",
        ]
        return random.choice(names)

    def show_summary(self, org):
        """Show final summary of students per odd semester"""
        self.stdout.write("\nFinal Summary - Students per Odd Semester:")
        self.stdout.write("=" * 50)

        odd_semesters = [1, 3, 5, 7]
        for sem in odd_semesters:
            count = Student.objects.filter(
                organization=org, current_semester=sem, is_active=True
            ).count()
            self.stdout.write(f"Semester {sem}: {count:4} students")

        total = Student.objects.filter(organization=org, is_active=True).count()
        self.stdout.write(f"Total:      {total:4} students")

        # Show departments with insufficient students
        self.stdout.write("\nDepartments needing attention:")
        departments = Department.objects.filter(organization=org, is_active=True)

        for dept in departments:
            issues = []
            for sem in odd_semesters:
                count = Student.objects.filter(
                    organization=org,
                    department=dept,
                    current_semester=sem,
                    is_active=True,
                ).count()
                if count < 50:
                    issues.append(f"S{sem}:{count}")

            if issues:
                self.stdout.write(f'  {dept.dept_code}: {", ".join(issues)}')
