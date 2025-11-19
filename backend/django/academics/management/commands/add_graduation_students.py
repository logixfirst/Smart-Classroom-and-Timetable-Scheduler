import random

from academics.models import Batch, Department, Organization, Program, Student, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Add 1000 students each to semester 5 and 7 for graduation programs"

    def handle(self, *args, **options):
        try:
            # Get organization
            org = Organization.objects.first()
            if not org:
                self.stdout.write(self.style.ERROR("No organization found"))
                return

            # Get all active departments for graduation programs
            graduation_depts = Department.objects.filter(
                organization=org, is_active=True
            )[
                :5
            ]  # Take first 5 departments

            if not graduation_depts.exists():
                self.stdout.write(self.style.ERROR("No departments found"))
                return

            self.stdout.write(
                f"Using departments: {[d.dept_name for d in graduation_depts]}"
            )

            # Indian names for realistic data
            first_names = [
                "Aarav",
                "Vivaan",
                "Aditya",
                "Vihaan",
                "Arjun",
                "Sai",
                "Reyansh",
                "Ayaan",
                "Krishna",
                "Ishaan",
                "Shaurya",
                "Atharv",
                "Advik",
                "Pranav",
                "Vivek",
                "Harsh",
                "Karan",
                "Rohan",
                "Aryan",
                "Dev",
                "Ananya",
                "Diya",
                "Priya",
                "Kavya",
                "Aanya",
                "Fatima",
                "Ira",
                "Myra",
                "Sara",
                "Zara",
                "Kiara",
                "Saanvi",
                "Aadya",
                "Khushi",
                "Angel",
                "Pari",
                "Avni",
                "Riya",
                "Sia",
                "Nisha",
            ]

            last_names = [
                "Sharma",
                "Verma",
                "Gupta",
                "Singh",
                "Kumar",
                "Agarwal",
                "Jain",
                "Patel",
                "Shah",
                "Mehta",
                "Reddy",
                "Nair",
                "Iyer",
                "Rao",
                "Pillai",
                "Menon",
                "Das",
                "Roy",
                "Ghosh",
                "Banerjee",
                "Khan",
                "Ali",
                "Ahmed",
                "Ansari",
                "Qureshi",
                "Siddiqui",
                "Malik",
                "Sheikh",
                "Hussain",
                "Rizvi",
            ]

            # Create students for semester 5 (2023-24 session)
            self.stdout.write("Creating semester 5 students (2023-24 session)...")
            sem5_count = 0

            for i in range(1000):
                dept = random.choice(graduation_depts)
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)

                # Generate unique username and email
                base_username = (
                    f"{first_name.lower()}{last_name.lower()}{random.randint(100, 999)}"
                )
                username = base_username
                email = f"{username}@student.edu"

                # Check if username exists
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    email = f"{username}@student.edu"
                    counter += 1

                # Create user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password="student123",
                )

                # Get or create a program and batch for this department
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
                        "min_eligibility": "12th Pass with PCM",
                        "is_active": True,
                    },
                )

                batch, _ = Batch.objects.get_or_create(
                    organization=org,
                    program=program,
                    department=dept,
                    year_of_admission=2023,
                    section="A",
                    defaults={
                        "batch_name": f"B.Tech {dept.dept_name} 2023",
                        "batch_code": f"23{dept.dept_code}A",
                        "current_semester": 5,
                        "total_students": 120,
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
                    roll_number=f"2023{dept.dept_code}{str(i+1).zfill(4)}",
                    student_name=f"{first_name} {last_name}",
                    email=email,
                    current_semester=5,
                    current_year=3,
                    date_of_admission=datetime(2023, 7, 15).date(),
                    expected_graduation_year=2027,
                    phone=f"+91{random.randint(7000000000, 9999999999)}",
                    is_active=True,
                )
                sem5_count += 1

            # Create students for semester 7 (2022-23 session)
            self.stdout.write("Creating semester 7 students (2022-23 session)...")
            sem7_count = 0

            for i in range(1000):
                dept = random.choice(graduation_depts)
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)

                # Generate unique username and email
                base_username = (
                    f"{first_name.lower()}{last_name.lower()}{random.randint(100, 999)}"
                )
                username = base_username
                email = f"{username}@student.edu"

                # Check if username exists
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    email = f"{username}@student.edu"
                    counter += 1

                # Create user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password="student123",
                )

                # Get or create a program and batch for this department
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
                        "min_eligibility": "12th Pass with PCM",
                        "is_active": True,
                    },
                )

                batch, _ = Batch.objects.get_or_create(
                    organization=org,
                    program=program,
                    department=dept,
                    year_of_admission=2022,
                    section="A",
                    defaults={
                        "batch_name": f"B.Tech {dept.dept_name} 2022",
                        "batch_code": f"22{dept.dept_code}A",
                        "current_semester": 7,
                        "total_students": 120,
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
                    roll_number=f"2022{dept.dept_code}{str(i+1).zfill(4)}",
                    student_name=f"{first_name} {last_name}",
                    email=email,
                    current_semester=7,
                    current_year=4,
                    date_of_admission=datetime(2022, 7, 15).date(),
                    expected_graduation_year=2026,
                    phone=f"+91{random.randint(7000000000, 9999999999)}",
                    is_active=True,
                )
                sem7_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully created {sem5_count} semester 5 students and {sem7_count} semester 7 students"
                )
            )

            # Print summary
            total_students = Student.objects.filter(organization=org).count()
            self.stdout.write(f"Total students in system: {total_students}")

            sem_breakdown = {}
            for sem in range(1, 9):
                count = Student.objects.filter(
                    organization=org, current_semester=sem
                ).count()
                sem_breakdown[sem] = count

            self.stdout.write("Semester-wise breakdown:")
            for sem, count in sem_breakdown.items():
                self.stdout.write(f"  Semester {sem}: {count} students")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
