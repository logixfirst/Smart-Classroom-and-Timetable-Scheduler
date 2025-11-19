from academics.models import Department, Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Update faculty names, phones, and assign subjects from their department"

    def handle(self, *args, **options):
        with transaction.atomic():
            self.fix_names()
            self.fix_phones()
            self.assign_subjects()
            self.stdout.write(self.style.SUCCESS("Faculty data updated successfully"))

    def fix_names(self):
        faculties = Faculty.objects.filter(
            faculty_name__in=[
                "Dr. Faculty member",
                "Faculty member",
                "Dr. Faculty Updated",
                "Dr. Faculty",
            ]
        )
        count = 0
        for i, faculty in enumerate(faculties, 1):
            Faculty.objects.filter(pk=faculty.pk).update(
                faculty_name=f"Dr. Faculty Member {i}"
            )
            count += 1
        self.stdout.write(f"Fixed {count} faculty names")

    def fix_phones(self):
        faculties = Faculty.objects.filter(phone__in=["9999999999", "", None])
        count = 0
        for i, faculty in enumerate(faculties, 1):
            phone = f"+91-{9000000000 + i}"
            Faculty.objects.filter(pk=faculty.pk).update(phone=phone)
            count += 1
        self.stdout.write(f"Fixed {count} phone numbers")

    def assign_subjects(self):
        from collections import defaultdict

        # Track subject assignments (max 2-3 per subject)
        subject_assignments = defaultdict(int)
        count = 0

        # Get faculty by department
        for dept in Department.objects.all():
            dept_faculty = Faculty.objects.filter(department=dept)
            dept_subjects = Subject.objects.filter(department=dept)

            if not dept_faculty.exists() or not dept_subjects.exists():
                continue

            faculty_list = list(dept_faculty)
            subject_list = list(dept_subjects)

            # Distribute subjects evenly (2-3 faculty per subject)
            for i, faculty in enumerate(faculty_list):
                # Cycle through subjects, max 2 faculty per subject
                subject_idx = i // 2 % len(subject_list)
                subject = subject_list[subject_idx]

                # Check if subject already has 3 assignments
                if subject_assignments[subject.subject_id] < 3:
                    Faculty.objects.filter(pk=faculty.pk).update(
                        specialization=subject.subject_name
                    )
                    subject_assignments[subject.subject_id] += 1
                    count += 1

        self.stdout.write(
            f"Assigned subjects to {count} faculty members with 2-3 faculty per subject"
        )
