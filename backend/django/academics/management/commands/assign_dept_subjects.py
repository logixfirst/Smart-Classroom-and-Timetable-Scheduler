"""Assign department-appropriate subjects to all faculty"""
from academics.models import Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Assign subjects to faculty based on department"

    def handle(self, *args, **options):
        with transaction.atomic():
            faculties = Faculty.objects.all().select_related("department")
            updated_count = 0

            for faculty in faculties:
                # Check if faculty already has subjects assigned
                has_subjects = Subject.objects.filter(
                    faculty_assigned=faculty.faculty_id
                ).exists()

                if not has_subjects:
                    # Get subjects from same department
                    dept_subjects = (
                        Subject.objects.filter(department=faculty.department)
                        .exclude(
                            faculty_assigned__in=Subject.objects.filter(
                                faculty_assigned__isnull=False
                            )
                            .values_list("faculty_assigned", flat=True)
                            .distinct()
                        )
                        .first()
                    )

                    if dept_subjects:
                        dept_subjects.faculty_assigned = faculty.faculty_id
                        dept_subjects.save()
                        faculty.specialization = dept_subjects.subject_name
                        faculty.save()
                        updated_count += 1
                        self.stdout.write(
                            f"✓ {faculty.faculty_name} ({faculty.department.department_name}) -> {dept_subjects.subject_name}"
                        )
                else:
                    # Update specialization for those who have subjects
                    subjects = Subject.objects.filter(
                        faculty_assigned=faculty.faculty_id
                    )[:2]
                    spec = ", ".join([s.subject_name for s in subjects])
                    if faculty.specialization != spec:
                        faculty.specialization = spec
                        faculty.save()
                        updated_count += 1

            self.stdout.write(
                self.style.SUCCESS(f"\n✓ Updated {updated_count} faculties")
            )
