"""Create Mohit user for testing"""
from academics.models import Department, Student, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create Mohit user for testing"

    def handle(self, *args, **options):
        password = "m@dhubala"

        # Create/Update Mohit user
        user, created = User.objects.update_or_create(
            email="mohit@gmail.com",
            defaults={"username": "mohit", "role": "student", "is_active": True},
        )
        user.set_password(password)
        user.save()

        # Create student profile if doesn't exist
        dept = Department.objects.first()
        if dept:
            student, _ = Student.objects.get_or_create(
                email="mohit@gmail.com",
                defaults={
                    "student_id": "MOHIT001",
                    "name": "Mohit Kumar",
                    "roll_number": "MOHIT001",
                    "department": dept,
                    "current_semester": 5,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ {"Created" if created else "Updated"} user: mohit')
        )
        self.stdout.write(f"Username: mohit")
        self.stdout.write(f"Email: mohit@gmail.com")
        self.stdout.write(f"Password: {password}")
        self.stdout.write(f"Role: student")
