import random
from datetime import date

from academics.models import Batch, Department, Organization, Program, Student, User
from django.core.management.base import BaseCommand
from django.db.models.signals import post_save


class Command(BaseCommand):
    help = "Add 1000 students each to semester 5 and 7 for graduation programs"

    def handle(self, *args, **kwargs):
        # Disconnect signals
        post_save.disconnect(signals.sync_student_to_user, sender=Student)
        post_save.disconnect(signals.sync_user_to_faculty_student, sender=User)

        try:
            self.stdout.write("Adding Semester 5 & 7 Students...")

            org = Organization.objects.first()
            if not org:
                self.stdout.write(self.style.ERROR("No organization found"))
                return

            # Get all active departments
            departments = Department.objects.filter(organization=org, is_active=True)

            if not departments.exists():
                self.stdout.write(self.style.ERROR("No departments found"))
                return

            self.stdout.write(
                f"Using {departments.count()} departments: {[d.dept_name for d in departments]}"
            )

            # Calculate students per department to reach ~1000 total per semester
            students_per_dept = max(
                1000 // departments.count(), 50
            )  # At least 50 per dept

            total_students_created = 0

            # Create students for semester 5 (2023-24 session)
            self.stdout.write(
                f"\nCreating semester 5 students (2023-24 session) - {students_per_dept} per department..."
            )

            for dept in departments:
                students_created = self.create_students_for_semester(
                    org, dept, 5, 2023, students_per_dept
                )
                total_students_created += students_created

            # Create students for semester 7 (2022-23 session)
            self.stdout.write(
                f"\nCreating semester 7 students (2022-23 session) - {students_per_dept} per department..."
            )

            for dept in departments:
                students_created = self.create_students_for_semester(
                    org, dept, 7, 2022, students_per_dept
                )
                total_students_created += students_created

            # Print summary
            self.stdout.write(
                f"\nSuccessfully created {total_students_created} students"
            )

            # Print semester breakdown
            for sem in [5, 7]:
                count = Student.objects.filter(
                    organization=org, current_semester=sem
                ).count()
                self.stdout.write(f"  Semester {sem}: {count} students")

        finally:
            # Reconnect signals
            post_save.connect(signals.sync_student_to_user, sender=Student)
            post_save.connect(signals.sync_user_to_faculty_student, sender=User)

    def create_students_for_semester(self, org, dept, semester, admission_year, count):
        """Create students for a specific semester and department"""
        students_created = 0
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
                "min_eligibility": "12th Pass with PCM",
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

        # Create students
        created_count = 0
        attempt = 1

        while created_count < count and attempt <= count * 2:  # Prevent infinite loop
            first_name, last_name = self.generate_indian_name()

            # Generate unique identifiers with random suffix to avoid duplicates
            base_username = (
                f"{first_name.lower()}{last_name.lower()}{random.randint(100, 999)}"
            )
            username = base_username
            roll_number = f"{admission_year}{dept.dept_code}{str(attempt).zfill(4)}"
            email = f"{username}@student.edu"

            # Skip if roll number exists
            if Student.objects.filter(
                organization=org, roll_number=roll_number
            ).exists():
                attempt += 1
                continue

            # Check username uniqueness
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                email = f"{username}@student.edu"
                counter += 1

            try:
                with transaction.atomic():
                    # Create user
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        password="student123",
                        organization=org,
                        role="student",
                        is_active=True,
                    )

                    # Create student
                    Student.objects.create(
                        user=user,
                        organization=org,
                        program=program,
                        department=dept,
                        batch=batch,
                        roll_number=roll_number,
                        student_name=f"{first_name} {last_name}",
                        email=email,
                        current_semester=semester,
                        current_year=((semester - 1) // 2) + 1,
                        date_of_admission=date(admission_year, 7, 15),
                        expected_graduation_year=admission_year + 4,
                        phone=f"+91{random.randint(7000000000, 9999999999)}",
                        is_active=True,
                        status="enrolled",
                    )
                    created_count += 1
                    students_created += 1
            except Exception:
                # Skip on any error and try next
                pass

            attempt += 1

        self.stdout.write(
            f"  {dept.dept_code}: Created {students_created} semester {semester} students"
        )
        return students_created

    def generate_indian_name(self):
        """Generate realistic Indian student names"""
        first_names = [
            "Aarav",
            "Vivaan",
            "Aditya",
            "Arjun",
            "Sai",
            "Arnav",
            "Ayaan",
            "Krishna",
            "Ishaan",
            "Reyansh",
            "Aadhya",
            "Saanvi",
            "Ananya",
            "Diya",
            "Aarohi",
            "Pari",
            "Navya",
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
            "Ravi",
            "Priya",
            "Sneha",
            "Pooja",
            "Neha",
            "Divya",
            "Anjali",
            "Kavya",
            "Shreya",
            "Riya",
            "Simran",
        ]

        last_names = [
            "Kumar",
            "Singh",
            "Sharma",
            "Verma",
            "Gupta",
            "Agarwal",
            "Patel",
            "Reddy",
            "Rao",
            "Nair",
            "Mishra",
            "Pandey",
            "Yadav",
            "Joshi",
            "Mehta",
            "Saxena",
            "Malhotra",
            "Khanna",
            "Bose",
            "Das",
        ]

        return random.choice(first_names), random.choice(last_names)
