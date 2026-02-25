"""
Migration: Add UserSession model for concurrent session management.
Manually written to avoid picking up unrelated pending model changes.
"""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0011_add_cancelling_cancelled_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSession",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "jti",
                    models.CharField(db_index=True, max_length=255, unique=True),
                ),
                ("device_info", models.CharField(blank=True, max_length=255)),
                ("ip_address", models.GenericIPAddressField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_active", models.DateTimeField(auto_now=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                (
                    "organization",
                    models.ForeignKey(
                        blank=True,
                        db_column="org_id",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to="academics.organization",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "user_sessions",
            },
        ),
        migrations.AddIndex(
            model_name="usersession",
            index=models.Index(
                fields=["user", "is_active"], name="session_user_active_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="usersession",
            index=models.Index(fields=["jti"], name="session_jti_idx"),
        ),
        migrations.AddIndex(
            model_name="usersession",
            index=models.Index(
                fields=["organization", "is_active"], name="session_org_active_idx"
            ),
        ),
    ]
