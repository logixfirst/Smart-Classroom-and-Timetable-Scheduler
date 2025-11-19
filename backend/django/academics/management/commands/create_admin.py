"""
Create admin user for BHU ERP
Username: harsh
Password: m@dhubala
"""

from academics.models import Organization, User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create admin user with username=harsh and password=m@dhubala"

    def handle(self, *args, **kwargs):
        org = Organization.objects.first()

        if not org:
            self.stdout.write(self.style.ERROR("No organization found!"))
            return

        # Create or update admin user
        user, created = User.objects.get_or_create(
            username="harsh",
            organization=org,
            defaults={
                "email": "harsh@bhu.ac.in",
                "first_name": "Harsh",
                "last_name": "Sharma",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        # Set password
        user.set_password("m@dhubala")
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.role = "admin"
        user.save()

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Admin User Ready!"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"Username: {user.username}")
        self.stdout.write(f"Email: {user.email}")
        self.stdout.write("Password: m@dhubala")
        self.stdout.write(f"Role: {user.role}")
        self.stdout.write(f"Is Staff: {user.is_staff}")
        self.stdout.write(f"Is Superuser: {user.is_superuser}")
        self.stdout.write(f"Is Active: {user.is_active}")
        self.stdout.write("=" * 70)

        if created:
            self.stdout.write(self.style.SUCCESS("✨ New admin user created!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️  Existing user updated!"))

        self.stdout.write("\n📝 Login Methods:")
        self.stdout.write("  1. Username: harsh")
        self.stdout.write("  2. Email: harsh@bhu.ac.in")
        self.stdout.write("  Password: m@dhubala")
        self.stdout.write("\n🌐 Login URLs:")
        self.stdout.write("  - Admin Panel: http://localhost:8000/admin/")
        self.stdout.write("  - API Login: http://localhost:8000/api/auth/login/")
