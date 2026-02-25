"""
Management command: cleanup_tokens

Deletes expired JWT outstanding tokens (and their blacklist entries) from the
database. Without this, the token_blacklist tables grow unboundedly — at
19,000 users refreshing hourly over 7 days that is millions of rows.

Usage:
    python manage.py cleanup_tokens
    python manage.py cleanup_tokens --grace-days 2   # keep 2-day buffer past expiry
    python manage.py cleanup_tokens --dry-run        # report counts without deleting

Schedule via Celery beat (see settings.CELERY_BEAT_SCHEDULE):
    Runs daily at 03:00 UTC (off-peak for BHU timezone UTC+5:30).
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

logger = logging.getLogger("academics")


class Command(BaseCommand):
    help = "Delete expired JWT outstanding tokens and their blacklist entries."

    def add_arguments(self, parser):
        parser.add_argument(
            "--grace-days",
            type=int,
            default=1,
            help="Delete tokens that expired more than N days ago (default: 1).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report how many rows would be deleted without deleting them.",
        )

    def handle(self, *args, **options):
        grace_days: int = options["grace_days"]
        dry_run: bool = options["dry_run"]

        # Import here so the command fails loudly if the app is not in INSTALLED_APPS
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        except ImportError as exc:
            raise CommandError(
                "rest_framework_simplejwt.token_blacklist is not installed. "
                "Add it to INSTALLED_APPS."
            ) from exc

        cutoff = timezone.now() - timedelta(days=grace_days)

        expired_qs = OutstandingToken.objects.filter(expires_at__lt=cutoff)
        count = expired_qs.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[dry-run] Would delete {count} OutstandingToken rows "
                    f"(expired before {cutoff.isoformat()})."
                )
            )
            logger.info(
                "cleanup_tokens dry-run",
                extra={"would_delete": count, "cutoff": cutoff.isoformat()},
            )
            return

        deleted, _ = expired_qs.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {deleted} expired OutstandingToken rows "
                f"(expired before {cutoff.isoformat()})."
            )
        )
        logger.info(
            "cleanup_tokens completed",
            extra={"deleted": deleted, "cutoff": cutoff.isoformat()},
        )
