"""
Add batches to all BHU programs that have zero batches
"""


from datetime import datetime

from academics import signals
from academics.models import Batch, Organization, Program, Subject
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.db.models.signals import post_save


class Command(BaseCommand):
    help = "Add batches to all BHU programs with zero batches"

    def handle(self, *args, **kwargs):
        # Disconnect signals
        post_save.disconnect(signals.sync_faculty_to_user, sender=Batch)

        try:
            self.stdout.write("🚀 Starting Batch Addition for All Programs...")

            org = Organization.objects.get(org_code="BHU")

            # Get all programs with zero batches
            programs_without_batches = (
                Program.objects.filter(organization=org)
                .annotate(batch_count=Count("batches"))
                .filter(batch_count=0)
                .select_related("school", "department")
            )

            total_programs = programs_without_batches.count()
            self.stdout.write(f"📊 Found {total_programs} programs without batches")

            if total_programs == 0:
                self.stdout.write(
                    self.style.SUCCESS("✅ All programs already have batches!")
                )
                return

            # Group by program type for appropriate batch years
            current_year = datetime.now().year

            for program in programs_without_batches:
                try:
                    with transaction.atomic():
                        # Determine batch years based on program type
                        duration = int(program.duration_years)

                        if program.program_type == "ug":
                            # Undergraduate: Add 2-3 recent batches
                            years = [current_year - 1, current_year - 2]
                            if duration >= 4:
                                years.append(current_year - 3)
                        elif program.program_type == "pg":
                            # Postgraduate: Add 1-2 recent batches
                            years = [current_year - 1]
                            if duration > 1:
                                years.append(current_year - 2)
                        elif program.program_type == "integrated":
                            # MBBS: Add 3-4 batches
                            years = [
                                current_year - 1,
                                current_year - 2,
                                current_year - 3,
                            ]
                        else:
                            # Default: 2 batches
                            years = [current_year - 1, current_year - 2]

                        # Create batches
                        batches_created = 0
                        for year in years:
                            batch, created = Batch.objects.get_or_create(
                                organization=org,
                                program=program,
                                year_of_admission=year,
                                section="A",
                                defaults={
                                    "department": program.department,
                                    "batch_name": f"{program.program_code} {year} Batch",
                                    "batch_code": f"{str(year)[-2:]}{program.program_code[:6].upper()}A",
                                    "current_semester": min(
                                        ((current_year - year) * 2) + 1,
                                        program.total_semesters,
                                    ),
                                    "total_students": 0,
                                    "is_active": True,
                                },
                            )
                            if created:
                                batches_created += 1

                                # Link subjects to batch through BatchSubjectEnrollment
                                # (Removed) BatchSubjectEnrollment logic - now using SubjectEnrollment only
                                # subjects = Subject.objects.filter(
                                #     organization=org, department=program.department
                                # )[:8]
                                # (Removed) BatchSubjectEnrollment creation

                        self.stdout.write(
                            f"✓ {program.program_code} ({program.school.school_code}): "
                            f"Added {batches_created} batches"
                        )

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Failed to add batches for {program.program_code}: {e}"
                        )
                    )

            # Print summary
            self.stdout.write("\n" + "=" * 80)
            programs_with_batches = (
                Program.objects.filter(organization=org)
                .annotate(batch_count=Count("batches"))
                .filter(batch_count__gt=0)
                .count()
            )

            total_batches = Batch.objects.filter(organization=org).count()

            self.stdout.write(
                self.style.SUCCESS(
                    "✅ Batch Addition Complete!\n"
                    f"   Programs with batches: {programs_with_batches}/{Program.objects.filter(organization=org).count()}\n"
                    f"   Total batches: {total_batches}"
                )
            )

        finally:
            # Reconnect signals
            post_save.connect(signals.sync_faculty_to_user, sender=Batch)
