"""Smart subject assignment based on departments"""
from academics.models import Department, Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Assign subjects to faculty based on their departments"

    def handle(self, *args, **options):
        with transaction.atomic():
            # Get all departments
            departments = Department.objects.all()

            for dept in departments:
                self.stdout.write(f"\n--- {dept.department_name} ---")

                # Get faculties in this department
                dept_faculties = list(Faculty.objects.filter(department=dept))
                # Get subjects in this department
                dept_subjects = list(Subject.objects.filter(department=dept))

                if not dept_faculties or not dept_subjects:
                    self.stdout.write(
                        f"  Skipped (faculties: {len(dept_faculties)}, subjects: {len(dept_subjects)})"
                    )
                    continue

                self.stdout.write(
                    f"  Faculties: {len(dept_faculties)}, Subjects: {len(dept_subjects)}"
                )

                # Assign subjects to faculties (max 2 faculties per subject if needed)
                faculty_idx = 0
                faculty_subject_count = defaultdict(int)

                for subject in dept_subjects:
                    # Find faculty with least subjects assigned
                    min_count = (
                        min(faculty_subject_count.values())
                        if faculty_subject_count
                        else 0
                    )
                    available_faculties = [
                        f
                        for f in dept_faculties
                        if faculty_subject_count[f.faculty_id] == min_count
                        or f.faculty_id not in faculty_subject_count
                    ]

                    if available_faculties:
                        faculty = available_faculties[
                            faculty_idx % len(available_faculties)
                        ]
                        subject.faculty_assigned = faculty.faculty_id
                        subject.save()
                        faculty_subject_count[faculty.faculty_id] += 1
                        self.stdout.write(
                            f"  ✓ {subject.subject_name} -> {faculty.faculty_name}"
                        )
                        faculty_idx += 1

                # Update faculty specializations
                for faculty in dept_faculties:
                    assigned = Subject.objects.filter(
                        faculty_assigned=faculty.faculty_id
                    )
                    if assigned.exists():
                        spec = ", ".join([s.subject_name for s in assigned[:3]])
                        faculty.specialization = spec
                        faculty.save()

            self.stdout.write(self.style.SUCCESS("\n✓ All departments updated!"))
