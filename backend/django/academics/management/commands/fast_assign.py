"""Fast subject assignment"""
from academics.models import Department, Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Fast subject assignment"

    def handle(self, *args, **options):
        depts = Department.objects.all()
        total_assigned = 0

        for dept in depts:
            faculties = list(Faculty.objects.filter(department=dept))
            subjects = Subject.objects.filter(department=dept)

            if not faculties:
                continue

            # Assign subjects round-robin
            updates = []
            for idx, subject in enumerate(subjects):
                fac = faculties[idx % len(faculties)]
                subject.faculty_assigned = fac.faculty_id
                updates.append(subject)

            if updates:
                Subject.objects.bulk_update(updates, ["faculty_assigned"])
                total_assigned += len(updates)

        self.stdout.write(f"✓ Assigned {total_assigned} subjects")

        # Update specializations
        faculties_to_update = []
        for fac in Faculty.objects.all():
            subjs = Subject.objects.filter(faculty_assigned=fac.faculty_id)[:3]
            if subjs:
                fac.specialization = ", ".join([s.subject_name for s in subjs])
                faculties_to_update.append(fac)

        Faculty.objects.bulk_update(faculties_to_update, ["specialization"])
        self.stdout.write(
            self.style.SUCCESS(f"✓ Updated {len(faculties_to_update)} specializations")
        )
