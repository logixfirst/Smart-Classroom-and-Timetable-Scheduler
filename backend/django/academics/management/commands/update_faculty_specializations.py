"""Update faculty specializations based on assigned subjects"""
from academics.models import Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Update all faculty specializations based on their assigned subjects"

    def handle(self, *args, **options):
        faculties = Faculty.objects.all()
        updated = 0

        for faculty in faculties:
            # Get subjects assigned to this faculty
            subjects = Subject.objects.filter(faculty_assigned=faculty.faculty_id)

            if subjects.exists():
                # Get first subject's name as specialization
                subject_names = [s.subject_name for s in subjects[:3]]  # Max 3 subjects
                specialization = ", ".join(subject_names)

                if faculty.specialization != specialization:
                    faculty.specialization = specialization
                    faculty.save()
                    updated += 1
                    self.stdout.write(f"✓ {faculty.faculty_name}: {specialization}")

        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Updated {updated} faculty specializations")
        )
