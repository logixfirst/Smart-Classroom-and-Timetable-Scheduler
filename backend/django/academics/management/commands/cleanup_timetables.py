"""
Management command: cleanup_timetables
Deletes all GenerationJob records (and their related Timetable rows) except
the single most-recently-completed job.
"""
from django.core.management.base import BaseCommand
from academics.models import GenerationJob, Timetable


class Command(BaseCommand):
    help = 'Keep only the most recent completed GenerationJob; delete all others.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be deleted without actually deleting.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        total = GenerationJob.objects.count()
        self.stdout.write(f'Total GenerationJob records: {total}')

        if total == 0:
            self.stdout.write(self.style.WARNING('No jobs found – nothing to do.'))
            return

        # Use values() to fetch only lightweight metadata (avoids huge timetable_data blobs)
        rows = list(
            GenerationJob.objects
            .order_by('-created_at')
            .values('id', 'status', 'created_at')[:30]
        )
        for r in rows:
            self.stdout.write(f"  id={r['id']}  status={r['status']}  created={r['created_at']}")

        # Find the most recent completed job (values dict)
        best_row = (
            GenerationJob.objects
            .filter(status='completed')
            .order_by('-created_at')
            .values('id', 'status', 'created_at')
            .first()
        )

        if best_row is None:
            self.stdout.write(self.style.WARNING(
                'No completed job found. Keeping only the most recent job regardless of status.'
            ))
            best_row = (
                GenerationJob.objects
                .order_by('-created_at')
                .values('id', 'status', 'created_at')
                .first()
            )

        self.stdout.write(self.style.SUCCESS(
            f"\nKeeping job: id={best_row['id']}  status={best_row['status']}  created={best_row['created_at']}"
        ))

        to_delete = GenerationJob.objects.exclude(pk=best_row['id'])
        delete_count = to_delete.count()

        if delete_count == 0:
            self.stdout.write(self.style.SUCCESS('Only one job exists – nothing to delete.'))
            return

        self.stdout.write(f'Jobs to delete: {delete_count}')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN – no records were deleted.'))
            return

        # Django CASCADE will remove child Timetable + TimetableSlot rows automatically
        deleted, breakdown = to_delete.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} records: {breakdown}'))
        self.stdout.write(self.style.SUCCESS('Done. Only the most recent completed job remains.'))
