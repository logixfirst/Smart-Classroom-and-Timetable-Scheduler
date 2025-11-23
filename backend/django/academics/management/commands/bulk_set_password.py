"""Fast bulk password update for all users"""
from academics.models import User
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Bulk update password for all users (very fast)"

    def handle(self, *args, **options):
        password = "m@dhubala"

        self.stdout.write("Starting bulk password update...")

        # Hash password once
        hashed_password = make_password(password)

        # Bulk update all users at once
        total = User.objects.count()
        updated = User.objects.update(password=hashed_password)

        self.stdout.write(self.style.SUCCESS(f"\n✓ Updated {updated} users in bulk!"))
        self.stdout.write(f"Total users: {total}")
        self.stdout.write(f"Password: {password}")
        self.stdout.write(
            self.style.WARNING("\nAll users can now login with: m@dhubala")
        )
