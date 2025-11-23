"""
Management command to set test passwords for users
Usage: python manage.py set_test_passwords
"""
from academics.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Set test password (m@dhuba;a) for sample users"

    def handle(self, *args, **options):
        password = "m@dhuba;a"

        # Sample users to update
        test_emails = [
            "s00001@sih28.com",
            "s00002@sih28.com",
            "s00003@sih28.com",
            "f001@sih28.com",
            "f002@sih28.com",
            "f003@sih28.com",
        ]

        updated = 0
        not_found = []

        for email in test_emails:
            try:
                user = User.objects.get(email=email)
                user.set_password(password)
                user.save()
                updated += 1
                self.stdout.write(f"  ✓ {email}")
            except User.DoesNotExist:
                not_found.append(email)

        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Password updated for {updated} users")
        )
        self.stdout.write(f"Password: {password}")

        if not_found:
            self.stdout.write(
                self.style.WARNING(f'\n⚠ Not found: {", ".join(not_found)}')
            )
