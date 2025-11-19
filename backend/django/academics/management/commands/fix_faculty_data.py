import re

from academics.models import Department, Faculty, Subject
from django.core.management.base import BaseCommand
from django.db import models, transaction


class Command(BaseCommand):
    help = "Fix faculty data issues: names, departments, specializations, phone numbers"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN MODE - No changes will be made")
            )

        with transaction.atomic():
            self.fix_faculty_names()
            self.fix_departments()
            self.fix_specializations()
            self.fix_phone_numbers()

            if dry_run:
                transaction.set_rollback(True)
                self.stdout.write(
                    self.style.SUCCESS("DRY RUN COMPLETE - No changes made")
                )
            else:
                self.stdout.write(self.style.SUCCESS("Faculty data cleanup completed"))

    def fix_faculty_names(self):
        """Fix generic faculty names like 'Dr. Faculty member'"""
        self.stdout.write("Fixing faculty names...")

        generic_names = [
            "Dr. Faculty member",
            "Faculty member",
            "Dr. Faculty",
            "Faculty",
            "Professor",
            "Dr. Professor",
        ]

        faculties = Faculty.objects.filter(faculty_name__in=generic_names)
        count = 0

        for faculty in faculties:
            # Generate name from employee_id or email
            if faculty.employee_id:
                new_name = f"Dr. {faculty.employee_id.replace('_', ' ').title()}"
            elif hasattr(faculty, "user") and faculty.user.email:
                username = faculty.user.email.split("@")[0]
                new_name = f"Dr. {username.replace('_', ' ').title()}"
            else:
                new_name = f"Dr. Faculty {faculty.id}"

            self.stdout.write(f"  {faculty.faculty_name} -> {new_name}")
            faculty.faculty_name = new_name
            faculty.save()
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Fixed {count} faculty names"))

    def fix_departments(self):
        """Fix empty departments"""
        self.stdout.write("Fixing empty departments...")

        faculties = Faculty.objects.filter(department__isnull=True)
        count = 0

        # Try to get a default department or create one
        try:
            default_dept = Department.objects.first()
            if not default_dept:
                default_dept = Department.objects.create(
                    name="General", code="GEN", organization_id=1  # Assuming first org
                )
        except Exception:
            default_dept = None

        for faculty in faculties:
            if default_dept:
                faculty.department = default_dept
                faculty.save()
                self.stdout.write(
                    f"  Assigned {faculty.faculty_name} to {default_dept.name}"
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Fixed {count} faculty departments"))

    def fix_specializations(self):
        """Fix specializations that contain department names instead of subjects"""
        self.stdout.write("Fixing specializations...")

        # Common department-like terms to remove
        dept_terms = [
            "Department o",
            "Dept of",
            "Faculty of",
            "School of",
            "specialist",
            "Specialist",
        ]

        # Subject mapping for common specializations
        subject_mapping = {
            "Law": "Constitutional Law",
            "Computer Science": "Data Structures",
            "Mathematics": "Calculus",
            "Physics": "Quantum Physics",
            "Chemistry": "Organic Chemistry",
            "Biology": "Cell Biology",
            "English": "English Literature",
            "History": "Modern History",
            "Economics": "Microeconomics",
            "Psychology": "Cognitive Psychology",
            "Engineering": "Engineering Mathematics",
            "Medicine": "Anatomy",
            "Business": "Business Management",
        }

        faculties = Faculty.objects.exclude(specialization__isnull=True).exclude(
            specialization=""
        )
        count = 0

        for faculty in faculties:
            original = faculty.specialization
            cleaned = original

            # Remove department terms
            for term in dept_terms:
                cleaned = re.sub(rf"\b{term}\b", "", cleaned, flags=re.IGNORECASE)

            # Clean up extra spaces
            cleaned = " ".join(cleaned.split())

            # Map to actual subjects if possible
            for dept, subject in subject_mapping.items():
                if dept.lower() in cleaned.lower():
                    cleaned = subject
                    break

            # If still looks like department, try to find actual subject
            if cleaned != original:
                faculty.specialization = cleaned
                faculty.save()
                self.stdout.write(
                    f'  {faculty.faculty_name}: "{original}" -> "{cleaned}"'
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Fixed {count} faculty specializations"))

    def fix_phone_numbers(self):
        """Fix missing or invalid phone numbers"""
        self.stdout.write("Fixing phone numbers...")

        faculties = Faculty.objects.filter(
            models.Q(phone__isnull=True)
            | models.Q(phone="")
            | models.Q(phone__regex=r"^[^0-9+]*$")
        )
        count = 0

        for faculty in faculties:
            # Generate a dummy phone number based on employee_id
            if faculty.employee_id:
                # Use last 10 digits of employee_id hash
                import hashlib

                hash_obj = hashlib.md5(faculty.employee_id.encode())
                hash_hex = hash_obj.hexdigest()
                phone = "9" + "".join(filter(str.isdigit, hash_hex))[:9]
            else:
                # Use faculty ID
                phone = f"9{str(faculty.id).zfill(9)}"

            faculty.phone = phone
            faculty.save()
            self.stdout.write(f"  {faculty.faculty_name}: Added phone {phone}")
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Fixed {count} faculty phone numbers"))
