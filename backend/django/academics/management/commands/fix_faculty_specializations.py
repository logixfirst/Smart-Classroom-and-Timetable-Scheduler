from academics.models import Faculty
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Fix faculty specializations that contain department names"

    def handle(self, *args, **options):
        # Get all faculty with problematic specializations
        faculty_to_fix = Faculty.objects.filter(
            specialization__icontains="Department o"
        )

        fixed_count = 0

        for faculty in faculty_to_fix:
            old_specialization = faculty.specialization

            # Extract the actual specialization from department-based strings
            if "Department of Agronomy specialist" in old_specialization:
                faculty.specialization = "Agronomy"
            elif "Department of Anatomy specialist" in old_specialization:
                faculty.specialization = "Anatomy"
            elif "Department of Biochemistry specialist" in old_specialization:
                faculty.specialization = "Biochemistry"
            elif (
                "Department of" in old_specialization
                and "specialist" in old_specialization
            ):
                # Generic cleanup for other departments
                dept_name = old_specialization.replace("Department of ", "").replace(
                    " specialist", ""
                )
                faculty.specialization = dept_name

            if faculty.specialization != old_specialization:
                faculty.save()
                fixed_count += 1
                self.stdout.write(
                    f'Fixed {faculty.faculty_name}: "{old_specialization}" -> "{faculty.specialization}"'
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully fixed {fixed_count} faculty specializations"
            )
        )
