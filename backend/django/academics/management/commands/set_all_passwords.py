"""Set default password for all users"""
from academics.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Set default password m@dhubala for all users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Set password for ALL users (can be slow)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Number of users to update (default: 100)",
        )

    def handle(self, *args, **options):
        password = "m@dhubala"

        if options["all"]:
            users = User.objects.all()
            self.stdout.write("Setting password for ALL users...")
        else:
            limit = options["limit"]
            users = User.objects.all()[:limit]
            self.stdout.write(f"Setting password for first {limit} users...")

        total = users.count()
        updated = 0

        for user in users:
            if not user.has_usable_password() or True:  # Update all
                user.set_password(password)
                user.save(update_fields=["password"])
                updated += 1

                if updated % 100 == 0:
                    self.stdout.write(f"  Updated {updated}/{total}...")

        self.stdout.write(self.style.SUCCESS(f"\n✓ Password set for {updated} users"))
        self.stdout.write(f"Password: {password}")
        self.stdout.write(
            self.style.WARNING("\nAll users can now login with: m@dhubala")
        )
