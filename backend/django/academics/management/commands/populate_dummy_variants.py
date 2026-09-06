"""
Management command to populate dummy timetable variants with test data.

Usage:
    python manage.py populate_dummy_variants
    python manage.py populate_dummy_variants --job-id <UUID>
    python manage.py populate_dummy_variants --latest
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from academics.models import GenerationJob, Organization
import uuid
import json
from datetime import datetime


class Command(BaseCommand):
    help = 'Populate dummy timetable variants with test scores'

    def add_arguments(self, parser):
        parser.add_argument(
            '--job-id',
            type=str,
            help='Specific GenerationJob UUID to populate',
        )
        parser.add_argument(
            '--latest',
            action='store_true',
            help='Use the latest GenerationJob',
        )
        parser.add_argument(
            '--create',
            action='store_true',
            help='Create a new GenerationJob if none exists',
        )

    def handle(self, *args, **options):
        # Find or create GenerationJob
        job = None

        if options['job_id']:
            try:
                job = GenerationJob.objects.get(id=options['job_id'])
                self.stdout.write(f"Found job: {job.id}")
            except GenerationJob.DoesNotExist:
                raise CommandError(f"Job {options['job_id']} not found")

        elif options['latest']:
            job = GenerationJob.objects.order_by('-created_at').first()
            if not job:
                raise CommandError("No GenerationJob found. Use --create to make one.")
            self.stdout.write(f"Using latest job: {job.id}")

        elif options['create']:
            org = Organization.objects.first()
            if not org:
                raise CommandError("No Organization found. Create one first.")
            job = GenerationJob.objects.create(
                organization=org,
                status='completed',
                academic_year='2024-25',
                semester=1,
            )
            self.stdout.write(f"✅ Created new job: {job.id}")
        else:
            job = GenerationJob.objects.order_by('-created_at').first()
            if not job:
                raise CommandError("No GenerationJob found. Use --job-id, --latest, or --create")
            self.stdout.write(f"Using latest job: {job.id}")

        # Dummy variant data with specific scores
        dummy_variants = [
            {
                "variant_number": 1,
                "overall_score": 73,
                "room_utilization": 90,
                "conflicts": 937,
            },
            {
                "variant_number": 2,
                "overall_score": 68,
                "room_utilization": 83,
                "conflicts": 1343,
            },
            {
                "variant_number": 3,
                "overall_score": 61,
                "room_utilization": 73,
                "conflicts": 2349,
            },
        ]

        # Build timetable_data structure
        variants = []
        for var_data in dummy_variants:
            variant = {
                "id": f"variant-{var_data['variant_number']}-{uuid.uuid4().hex[:8]}",
                "variant_number": var_data["variant_number"],
                "optimization_priority": "balanced",
                "timetable_entries": self._generate_dummy_entries(var_data["conflicts"]),
                "statistics": {
                    "total_classes": 500,
                    "total_hours": 100,
                    "unique_subjects": 45,
                    "unique_faculty": 50,
                    "unique_rooms": 25,
                    "average_classes_per_day": 10,
                },
                "quality_metrics": {
                    "overall_score": var_data["overall_score"],
                    "total_conflicts": var_data["conflicts"],
                    "hard_constraint_violations": max(0, var_data["conflicts"] - 100),
                    "soft_constraint_violations": 50,
                    "room_utilization_score": var_data["room_utilization"],
                    "faculty_workload_balance_score": 85,
                    "student_compactness_score": 80,
                },
                "formula_version": "2",
                "recalculated_at": datetime.now().isoformat(),
                "generated_at": datetime.now().isoformat(),
            }
            variants.append(variant)

        # Update GenerationJob with variants
        timetable_data = {
            "variants": variants,
            "job_id": str(job.id),
            "academic_year": job.academic_year,
            "semester": job.semester,
            "generated_at": datetime.now().isoformat(),
        }

        job.timetable_data = timetable_data
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.save()

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ Dummy data populated successfully!\n")
        )
        self.stdout.write(f"Job ID: {job.id}")
        self.stdout.write(f"Variants created: {len(variants)}\n")

        for var in variants:
            self.stdout.write(
                f"  Variant {var['variant_number']}: "
                f"Score={var['quality_metrics']['overall_score']}%, "
                f"Room Util={var['quality_metrics']['room_utilization_score']}%, "
                f"Conflicts={var['quality_metrics']['total_conflicts']}"
            )

    def _generate_dummy_entries(self, conflict_count):
        """Generate dummy timetable entries"""
        # Simple dummy entries - just enough to make it realistic
        entries = []
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        times = [
            ("08:00", "09:00"),
            ("09:00", "10:00"),
            ("10:00", "11:00"),
            ("11:00", "12:00"),
            ("12:00", "13:00"),
        ]

        entry_count = min(100, max(50, conflict_count // 10))  # Scale with conflicts

        for i in range(entry_count):
            day_idx = i % len(days)
            time_idx = (i // len(days)) % len(times)
            start, end = times[time_idx]

            entries.append({
                "day": day_idx,
                "course_id": f"course-{i}",
                "time_slot": f"slot-{time_idx}",
                "start_time": start,
                "end_time": end,
                "subject_id": f"subj-{i % 45}",
                "subject_name": f"Subject {i % 45}",
                "subject_code": f"S{i % 45:03d}",
                "faculty_id": f"fac-{i % 50}",
                "faculty_name": f"Faculty {i % 50}",
                "batch_id": f"batch-{i % 10}",
                "batch_name": f"Batch {i % 10}",
                "classroom_id": f"room-{i % 25}",
                "room_number": f"Room {i % 25}",
                "duration_minutes": 60,
            })

        return entries
