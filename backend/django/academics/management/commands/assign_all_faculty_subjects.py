"""Assign subjects to all faculty and update specializations"""
from academics.models import Department, Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Assign subjects to faculty and update specializations"

    def handle(self, *args, **options):
        with transaction.atomic():
            # Get all faculties and subjects
            faculties = list(Faculty.objects.all())
            subjects = list(Subject.objects.all())

            total_subjects = len(subjects)
            total_faculties = len(faculties)

            self.stdout.write(f"Total faculties: {total_faculties}")
            self.stdout.write(f"Total subjects: {total_subjects}")

            # Assign subjects to faculties in round-robin fashion
            updates = []
            for i, subject in enumerate(subjects):
                faculty_index = i % total_faculties
                faculty = faculties[faculty_index]

                if subject.faculty_assigned != faculty.faculty_id:
                    subject.faculty_assigned = faculty.faculty_id
                    updates.append(subject)

            # Bulk update subjects
            Subject.objects.bulk_update(updates, ["faculty_assigned"], batch_size=500)
            self.stdout.write(f"✓ Updated {len(updates)} subject assignments")

            # Update faculty specializations
            fac_updates = []
            for faculty in faculties:
                assigned_subjects = Subject.objects.filter(
                    faculty_assigned=faculty.faculty_id
                )[:3]
                if assigned_subjects:
                    subject_names = [s.subject_name for s in assigned_subjects]
                    new_spec = ", ".join(subject_names)
                    if faculty.specialization != new_spec:
                        faculty.specialization = new_spec
                        fac_updates.append(faculty)

            Faculty.objects.bulk_update(fac_updates, ["specialization"], batch_size=500)
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Updated {len(fac_updates)} faculty specializations"
                )
            )
            self.stdout.write(self.style.SUCCESS("Done!"))
