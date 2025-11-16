"""
Management command to perform one-time bulk sync of User, Faculty, and Student data
Usage: python manage.py sync_user_data
"""

from django.core.management.base import BaseCommand
from academics.signals import bulk_sync_users_to_faculty_students
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Perform one-time bulk synchronization of User, Faculty, and Student data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes (preview mode)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('Running in DRY RUN mode - no changes will be made')
            )
        
        self.stdout.write('Starting data synchronization...')
        self.stdout.write('=' * 80)
        
        try:
            synced_faculty, synced_students = bulk_sync_users_to_faculty_students()
            
            self.stdout.write(
                self.style.SUCCESS(f'\n✓ Synchronization completed successfully!')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  - Faculty records synced: {synced_faculty}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  - Student records synced: {synced_students}')
            )
            self.stdout.write('=' * 80)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n✗ Synchronization failed: {str(e)}')
            )
            logger.error(f'Bulk sync failed: {e}', exc_info=True)
            raise
