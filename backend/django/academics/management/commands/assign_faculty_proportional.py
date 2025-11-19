from academics.models import Department, Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Assign faculty to subjects proportionally based on department subject count"

    def handle(self, *args, **options):
        with transaction.atomic():
            self.assign_faculty_proportional()
            self.stdout.write(self.style.SUCCESS("Faculty assigned proportionally"))

    def assign_faculty_proportional(self):
        # Calculate total subjects and faculty
        total_subjects = Subject.objects.count()
        total_faculty = Faculty.objects.count()

        self.stdout.write(
            f"Total subjects: {total_subjects}, Total faculty: {total_faculty}"
        )

        # Calculate faculty allocation per department based on subject count
        dept_allocations = {}
        for dept in Department.objects.all():
            dept_subjects = Subject.objects.filter(department=dept).count()
            if dept_subjects > 0:
                # Proportional allocation: (dept_subjects / total_subjects) * total_faculty
                allocated_faculty = int(
                    (dept_subjects / total_subjects) * total_faculty
                )
                dept_allocations[dept.pk] = {
                    "subjects": dept_subjects,
                    "allocated_faculty": max(
                        allocated_faculty, 1
                    ),  # At least 1 faculty per dept
                }
                self.stdout.write(
                    f"Dept {dept.pk}: {dept_subjects} subjects → {allocated_faculty} faculty"
                )

        # Assign faculty to departments proportionally
        faculty_assigned = 0
        for dept_id, allocation in dept_allocations.items():
            dept = Department.objects.get(pk=dept_id)

            # Get unassigned faculty or reassign existing
            available_faculty = Faculty.objects.filter(department=dept)[
                : allocation["allocated_faculty"]
            ]

            if not available_faculty.exists():
                # If no faculty in this dept, assign from other depts
                available_faculty = Faculty.objects.all()[
                    faculty_assigned : faculty_assigned
                    + allocation["allocated_faculty"]
                ]
                # Update their department
                for faculty in available_faculty:
                    Faculty.objects.filter(pk=faculty.pk).update(department=dept)

            # Assign subjects to faculty in this department
            dept_subjects = list(Subject.objects.filter(department=dept))
            faculty_list = list(available_faculty)

            for i, faculty in enumerate(faculty_list):
                # Assign 2-3 subjects per faculty
                subject_idx = i % len(dept_subjects)
                subject = dept_subjects[subject_idx]
                Faculty.objects.filter(pk=faculty.pk).update(
                    specialization=subject.subject_name
                )
                faculty_assigned += 1

        self.stdout.write(f"Assigned {faculty_assigned} faculty members proportionally")
