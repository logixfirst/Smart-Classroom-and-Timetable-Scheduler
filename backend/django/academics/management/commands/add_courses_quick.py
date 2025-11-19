"""Add MCom and BCA courses and fix data quickly"""
from academics.models import Course, Department, Faculty, Subject
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Add courses and fix data"

    def handle(self, *args, **options):
        self.stdout.write("Starting...")

        with transaction.atomic():
            # Add MCom course
            mcom, created = Course.objects.get_or_create(
                course_id="MCOM01",
                defaults={
                    "course_name": "Master of Commerce",
                    "duration_years": 2,
                    "level": "PG",
                },
            )
            self.stdout.write(f'MCom: {"Created" if created else "Exists"}')

            # Add BCA course
            bca, created = Course.objects.get_or_create(
                course_id="BCA01",
                defaults={
                    "course_name": "Bachelor of Computer Applications",
                    "duration_years": 3,
                    "level": "UG",
                },
            )
            self.stdout.write(f'BCA: {"Created" if created else "Exists"}')

            # Get CS department
            cs_dept = Department.objects.filter(
                department_name__icontains="computer"
            ).first()
            mgmt_dept = Department.objects.filter(
                department_name__icontains="management"
            ).first()

            if not cs_dept or not mgmt_dept:
                self.stdout.write(self.style.ERROR("Departments not found"))
                return

            # Add BCA subjects (only if not exists)
            bca_subjects = [
                ("BCA101", "Programming in C", cs_dept, bca),
                ("BCA102", "Web Development", cs_dept, bca),
                ("BCA103", "Data Structures", cs_dept, bca),
            ]

            # Add MCom subjects
            mcom_subjects = [
                ("MCOM101", "Advanced Accounting", mgmt_dept, mcom),
                ("MCOM102", "Business Statistics", mgmt_dept, mcom),
            ]

            created_count = 0
            for subj_id, subj_name, dept, course in bca_subjects + mcom_subjects:
                subj, created = Subject.objects.get_or_create(
                    subject_id=subj_id,
                    defaults={
                        "subject_name": subj_name,
                        "department": dept,
                        "course": course,
                        "credits": 4,
                        "faculty_assigned": "",
                    },
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"Created: {subj_name}")

            self.stdout.write(
                self.style.SUCCESS(f"\nDone! Created {created_count} new subjects")
            )
