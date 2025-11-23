"""Check faculty assignments"""
from academics.models import Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Check faculty assignments"

    def handle(self, *args, **options):
        self.stdout.write("=== Checking Faculty Assignments ===\n")

        # Check f001@sih28.com
        faculty = Faculty.objects.filter(email="f001@sih28.com").first()

        if not faculty:
            self.stdout.write(self.style.ERROR("❌ Faculty f001@sih28.com not found"))
            return

        self.stdout.write(f"✓ Faculty found")
        self.stdout.write(f"  ID: {faculty.faculty_id}")
        self.stdout.write(f"  Name: {faculty.faculty_name}")
        self.stdout.write(f"  Email: {faculty.email}")

        # Check subjects
        subjects = Subject.objects.filter(faculty_assigned=faculty.faculty_id)
        self.stdout.write(f"\nSubjects assigned: {subjects.count()}")

        if subjects.exists():
            for subject in subjects[:10]:
                self.stdout.write(f"  • {subject.subject_id}: {subject.subject_name}")
        else:
            self.stdout.write(self.style.WARNING("  ⚠ No subjects assigned!"))
