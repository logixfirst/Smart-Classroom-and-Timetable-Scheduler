import csv
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from academics.models import (
    User,
    Department,
    Course,
    Subject,
    Faculty,
    Student,
    Batch,
    Classroom,
    Lab,
)


class Command(BaseCommand):
    help = "Import data from CSV files and create users"

    def handle(self, *args, **kwargs):
        # Get the root directory (where CSV files are located)
        # From: backend/django/academics/management/commands/ -> root
        root_dir = os.path.dirname(
            os.path.dirname(
                os.path.dirname(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                )
            )
        )

        self.stdout.write(self.style.SUCCESS("Starting data import..."))
        self.stdout.write(f"Looking for CSV files in: {root_dir}")

        # Import Departments
        self.import_departments(os.path.join(root_dir, "departments.csv"))

        # Import Courses
        self.import_courses(os.path.join(root_dir, "courses.csv"))

        # Import Subjects
        self.import_subjects(os.path.join(root_dir, "subjects.csv"))

        # Import Faculty
        self.import_faculty(os.path.join(root_dir, "faculty_100.csv"))

        # Import Students
        self.import_students(os.path.join(root_dir, "students.csv"))

        # Import Batches
        self.import_batches(os.path.join(root_dir, "batches.csv"))

        # Import Classrooms
        self.import_classrooms(os.path.join(root_dir, "classrooms.csv"))

        # Import Labs
        self.import_labs(os.path.join(root_dir, "labs.csv"))

        # Create default RBAC users
        self.create_default_users()

        self.stdout.write(self.style.SUCCESS("✅ Data import completed successfully!"))

    def import_departments(self, file_path):
        self.stdout.write("Importing departments...")
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                Department.objects.get_or_create(
                    department_id=row["department_id"],
                    defaults={
                        "department_name": row["department_name"],
                        "building_name": row["building_name"],
                        "head_of_department": row["head_of_department"],
                    },
                )
                count += 1
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} departments"))

    def import_courses(self, file_path):
        self.stdout.write("Importing courses...")
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                Course.objects.get_or_create(
                    course_id=row["course_id"],
                    defaults={
                        "course_name": row["course_name"],
                        "duration_years": int(row["duration_years"]),
                        "level": row["level"],
                    },
                )
                count += 1
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} courses"))

    def import_subjects(self, file_path):
        self.stdout.write("Importing subjects...")
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                try:
                    course = Course.objects.get(course_id=row["course_id"])
                    department = Department.objects.get(
                        department_id=row["department_id"]
                    )

                    Subject.objects.get_or_create(
                        subject_id=row["subject_id"],
                        defaults={
                            "subject_name": row["subject_name"],
                            "course": course,
                            "department": department,
                            "faculty_assigned": row.get("faculty_assigned", ""),
                            "credits": int(row["credits"]),
                        },
                    )
                    count += 1
                except (Course.DoesNotExist, Department.DoesNotExist) as e:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping subject {row["subject_id"]}: {e}')
                    )
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} subjects"))

    def import_faculty(self, file_path):
        self.stdout.write("Importing faculty and creating user accounts...")
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                if not row.get("faculty_id"):  # Skip empty rows
                    continue
                try:
                    # Map CSV columns to model fields
                    dept_name = row.get("department", "Computer Science")
                    department = Department.objects.filter(
                        department_name__icontains=dept_name[:3]
                    ).first()
                    if not department:
                        department = Department.objects.first()

                    # Generate email if not present
                    email = row.get("email", f"{row['faculty_id'].lower()}@sih28.com")
                    phone = row.get("phone", "9999999999")

                    # Create Faculty
                    faculty, created = Faculty.objects.get_or_create(
                        faculty_id=row["faculty_id"],
                        defaults={
                            "faculty_name": row["faculty_name"],
                            "designation": row.get("designation", "Professor"),
                            "department": department,
                            "specialization": row.get("specialization", "General"),
                            "max_workload_per_week": int(
                                row.get("max_workload_per_week", 18)
                            ),
                            "email": email,
                            "phone": phone,
                        },
                    )

                    # Create User for Faculty
                    if created:
                        User.objects.create(
                            username=row["faculty_id"],
                            email=email,
                            password=make_password("sih28"),  # Default password
                            role="faculty",
                            department=department.department_name,
                            first_name=row["faculty_name"].split()[0],
                            last_name=" ".join(row["faculty_name"].split()[1:])
                            if len(row["faculty_name"].split()) > 1
                            else "",
                        )
                    count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping faculty {row.get("faculty_id", "unknown")}: {e}'
                        )
                    )
        self.stdout.write(
            self.style.SUCCESS(f"✅ Imported {count} faculty members with user accounts")
        )

    def import_students(self, file_path):
        self.stdout.write("Importing students and creating user accounts...")

        # Pre-fetch all departments, courses, and faculty for faster lookups
        dept_map = {d.department_name: d for d in Department.objects.all()}
        course_map = {c.course_name: c for c in Course.objects.all()}
        faculty_map = {f.faculty_id: f for f in Faculty.objects.all()}

        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            batch_size = 100
            students_batch = []
            users_batch = []

            for row in reader:
                if not row.get("student_id"):
                    continue

                try:
                    # Fast lookup using pre-built maps
                    dept_name = row.get("department", "Computer Science")
                    department = dept_map.get(dept_name) or next(
                        iter(dept_map.values())
                    )

                    course_name = row.get("course", "B.Tech")
                    course = course_map.get(course_name) or next(
                        iter(course_map.values())
                    )

                    faculty_advisor = faculty_map.get(row.get("faculty_id"))

                    email = f"{row['student_id'].lower()}@sih28.com"

                    # Create student object (don't save yet)
                    student = Student(
                        student_id=row["student_id"],
                        name=row["name"],
                        department=department,
                        course=course,
                        electives=row.get("electives", ""),
                        year=int(row.get("year", 1)),
                        semester=int(row.get("semester", 1)),
                        faculty_advisor=faculty_advisor,
                        email=email,
                        phone=row.get("phone", "9999999999"),
                    )

                    # Create user object (don't save yet)
                    user = User(
                        username=row["student_id"],
                        email=email,
                        password=make_password("sih28"),
                        role="student",
                        department=department.department_name,
                        first_name=row["name"].split()[0],
                        last_name=" ".join(row["name"].split()[1:])
                        if len(row["name"].split()) > 1
                        else "",
                    )

                    students_batch.append(student)
                    users_batch.append(user)
                    count += 1

                    # Bulk insert every batch_size records
                    if len(students_batch) >= batch_size:
                        Student.objects.bulk_create(
                            students_batch, ignore_conflicts=True
                        )
                        User.objects.bulk_create(users_batch, ignore_conflicts=True)
                        self.stdout.write(
                            f"  Imported {count} students...", ending="\r"
                        )
                        students_batch = []
                        users_batch = []

                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f'\nSkipping student {row.get("student_id", "unknown")}: {e}'
                        )
                    )

            # Insert remaining records
            if students_batch:
                Student.objects.bulk_create(students_batch, ignore_conflicts=True)
                User.objects.bulk_create(users_batch, ignore_conflicts=True)

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ Imported {count} students with user accounts")
        )

    def import_batches(self, file_path):
        self.stdout.write("Importing batches...")
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                try:
                    course = Course.objects.get(course_id=row["course_id"])
                    department = Department.objects.get(
                        department_id=row["department_id"]
                    )

                    Batch.objects.get_or_create(
                        batch_id=row["batch_id"],
                        defaults={
                            "course": course,
                            "department": department,
                            "year": int(row["year"]),
                            "semester": int(row["semester"]),
                            "no_of_students": int(row["no_of_students"]),
                        },
                    )
                    count += 1
                except (Course.DoesNotExist, Department.DoesNotExist) as e:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping batch {row["batch_id"]}: {e}')
                    )
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} batches"))

    def import_classrooms(self, file_path):
        self.stdout.write("Importing classrooms...")
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                try:
                    department = Department.objects.get(
                        department_id=row["department_id"]
                    )

                    Classroom.objects.get_or_create(
                        room_id=row["room_id"],
                        defaults={
                            "room_number": row["room_number"],
                            "capacity": int(row["capacity"]),
                            "room_type": row.get("type", "lecture hall"),
                            "department": department,
                        },
                    )
                    count += 1
                except Department.DoesNotExist as e:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping classroom {row["room_id"]}: {e}')
                    )
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} classrooms"))

    def import_labs(self, file_path):
        self.stdout.write("Importing labs...")
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                try:
                    department = Department.objects.get(
                        department_id=row["department_id"]
                    )

                    Lab.objects.get_or_create(
                        lab_id=row["lab_id"],
                        defaults={
                            "lab_name": row["lab_name"],
                            "capacity": int(row["capacity"]),
                            "department": department,
                        },
                    )
                    count += 1
                except Department.DoesNotExist as e:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping lab {row["lab_code"]}: {e}')
                    )
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} labs"))

    def create_default_users(self):
        self.stdout.write("Creating default RBAC users...")

        # Default users for testing
        default_users = [
            {
                "username": "admin",
                "email": "admin@sih28.com",
                "password": "sih28",
                "role": "admin",
                "first_name": "Admin",
                "last_name": "User",
                "is_staff": True,
                "is_superuser": True,
            },
            {
                "username": "staff",
                "email": "staff@sih28.com",
                "password": "sih28",
                "role": "staff",
                "first_name": "Staff",
                "last_name": "User",
            },
            {
                "username": "faculty_demo",
                "email": "faculty@sih28.com",
                "password": "sih28",
                "role": "faculty",
                "first_name": "Faculty",
                "last_name": "Demo",
                "department": "Computer Science",
            },
            {
                "username": "student_demo",
                "email": "student@sih28.com",
                "password": "sih28",
                "role": "student",
                "first_name": "Student",
                "last_name": "Demo",
                "department": "Computer Science",
            },
        ]

        for user_data in default_users:
            user, created = User.objects.get_or_create(
                username=user_data["username"],
                defaults={
                    "email": user_data["email"],
                    "password": make_password(user_data["password"]),
                    "role": user_data["role"],
                    "first_name": user_data["first_name"],
                    "last_name": user_data["last_name"],
                    "department": user_data.get("department", ""),
                    "is_staff": user_data.get("is_staff", False),
                    "is_superuser": user_data.get("is_superuser", False),
                },
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Created user: {user_data["username"]} (password: {user_data["password"]})'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️  User already exists: {user_data["username"]}'
                    )
                )

        self.stdout.write(self.style.SUCCESS("✅ Default RBAC users created"))
