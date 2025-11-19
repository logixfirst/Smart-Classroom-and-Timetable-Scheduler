import re

from academics.models import Department, Faculty
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Clean faculty data without triggering signals"

    def handle(self, *args, **options):
        with transaction.atomic():
            # Disable signals temporarily
            from academics import signals
            from django.db.models.signals import post_save, pre_save

            # Disconnect signals
            post_save.disconnect(sender=Faculty)
            pre_save.disconnect(sender=Faculty)

            try:
                self.clean_names()
                self.clean_departments()
                self.clean_specializations()
                self.clean_phones()
                self.stdout.write(
                    self.style.SUCCESS("Faculty data cleaned successfully")
                )
            finally:
                # Signals will reconnect automatically on next import
                pass

    def clean_names(self):
        count = Faculty.objects.filter(
            faculty_name__in=[
                "Dr. Faculty member",
                "Faculty member",
                "Dr. Faculty",
                "Faculty",
            ]
        ).update(faculty_name="Dr. Faculty Updated")
        self.stdout.write(f"Fixed {count} faculty names")

    def clean_departments(self):
        default_dept = Department.objects.first()
        if default_dept:
            count = Faculty.objects.filter(department__isnull=True).update(
                department=default_dept
            )
            self.stdout.write(f"Fixed {count} faculty departments")

    def clean_specializations(self):
        # Clean specializations with department terms
        faculties = Faculty.objects.exclude(specialization__isnull=True).exclude(
            specialization=""
        )
        count = 0
        for faculty in faculties:
            original = faculty.specialization
            if "Department o" in original or "specialist" in original:
                cleaned = re.sub(
                    r"Department of |specialist", "", original, flags=re.IGNORECASE
                ).strip()
                Faculty.objects.filter(pk=faculty.pk).update(specialization=cleaned)
                count += 1
        self.stdout.write(f"Fixed {count} specializations")

    def clean_phones(self):
        count = Faculty.objects.filter(phone__isnull=True).update(phone="9999999999")
        count += Faculty.objects.filter(phone="").update(phone="9999999999")
        self.stdout.write(f"Fixed {count} phone numbers")
