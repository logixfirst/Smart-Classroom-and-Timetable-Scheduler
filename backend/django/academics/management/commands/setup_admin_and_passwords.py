"""
Management command to setup admin and update test passwords
Usage: python manage.py setup_admin_and_passwords
"""
from academics.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Setup admin harsh and update test passwords"

    def handle(self, *args, **options):
        password = "m@dhubala"

        # Delete dummy users
        deleted = User.objects.filter(username__in=["student", "faculty"]).delete()
        if deleted[0] > 0:
            self.stdout.write(f"✓ Deleted {deleted[0]} dummy users (student, faculty)")

        # Create/Update admin harsh
        admin, created = User.objects.update_or_create(
            username="harsh",
            defaults={
                "email": "harsh@sih28.com",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.set_password(password)
        admin.save()
        self.stdout.write(
            f'✓ {"Created" if created else "Updated"} admin: harsh@sih28.com'
        )

        # Update password for specific test users
        test_emails = [
            "s00001@sih28.com",
            "s00002@sih28.com",
            "s00003@sih28.com",
            "f001@sih28.com",
            "f002@sih28.com",
            "f003@sih28.com",
            "harsh@sih28.com",
        ]

        updated = 0
        for email in test_emails:
            try:
                user = User.objects.get(email=email)
                user.set_password(password)
                user.save()
                updated += 1
                self.stdout.write(f"  ✓ {email}")
            except User.DoesNotExist:
                pass

        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Password updated for {updated} users")
        )
        self.stdout.write(self.style.SUCCESS(f"Password: {password}"))
        self.stdout.write(self.style.WARNING(f"\nAdmin Login:"))
        self.stdout.write(f"  Username: harsh")
        self.stdout.write(f"  Email: harsh@sih28.com")
        self.stdout.write(f"  Password: {password}")
