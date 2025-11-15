import csv
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from academics.models import User, Department, Course, Batch, Classroom, Lab


class Command(BaseCommand):
    help = "Import remaining data (batches, classrooms, labs, default users)"

    def handle(self, *args, **kwargs):
        # Get to the SIH28 root directory (where CSV files are)
        root_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        )
        root_dir = os.path.dirname(
            os.path.dirname(root_dir)
        )  # Go up from django/academics/management/commands

        self.stdout.write(self.style.SUCCESS("Importing remaining data..."))

        # Import Batches
        self.import_batches(os.path.join(root_dir, "batches.csv"))

        # Import Classrooms
        self.import_classrooms(os.path.join(root_dir, "classrooms.csv"))

        # Import Labs
        self.import_labs(os.path.join(root_dir, "labs.csv"))

        # Create default RBAC users
        self.create_default_users()

        self.stdout.write(self.style.SUCCESS("✅ Remaining data imported successfully!"))

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
                        self.style.WARNING(f'Skipping lab {row["lab_id"]}: {e}')
                    )
        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} labs"))

    def create_default_users(self):
        self.stdout.write("Creating default RBAC users...")

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
