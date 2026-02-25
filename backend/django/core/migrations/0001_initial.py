"""
Initial migration for the core app.
Creates:
  - core_auditlog   (AuditLog model)
  - security_events (SecurityEvent model)
"""
import django.db.models.deletion
import django.utils.timezone

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("academics", "0012_add_user_session"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ------------------------------------------------------------------
        # AuditLog
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="AuditLog",
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
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("username", models.CharField(max_length=150)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("action", models.CharField(db_index=True, max_length=100)),
                ("resource_type", models.CharField(max_length=50)),
                ("resource_id", models.CharField(max_length=100)),
                (
                    "timestamp",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(blank=True, null=True),
                ),
                ("user_agent", models.TextField(blank=True)),
                ("changes", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(default="success", max_length=20)),
                ("error_message", models.TextField(blank=True)),
            ],
            options={
                "db_table": "core_auditlog",
                "ordering": ["-timestamp"],
            },
        ),
        migrations.AddIndex(
            model_name="AuditLog",
            index=models.Index(
                fields=["organization_id", "-timestamp"],
                name="core_auditlog_org_ts_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="AuditLog",
            index=models.Index(
                fields=["user", "-timestamp"],
                name="core_auditlog_user_ts_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="AuditLog",
            index=models.Index(
                fields=["action", "-timestamp"],
                name="core_auditlog_action_ts_idx",
            ),
        ),
        # ------------------------------------------------------------------
        # SecurityEvent
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="SecurityEvent",
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
                    "event_type",
                    models.CharField(
                        choices=[
                            ("login_success", "Login Success"),
                            ("login_failure", "Login Failure"),
                            ("login_locked", "Account Locked"),
                            ("token_refresh", "Token Refreshed"),
                            ("token_mismatch", "Device Fingerprint Mismatch"),
                            ("token_revoked", "Session Revoked"),
                            ("permission_denied", "Permission Denied"),
                            ("logout", "Logout"),
                            ("password_changed", "Password Changed"),
                            ("password_reset", "Password Reset Requested"),
                        ],
                        db_index=True,
                        max_length=30,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "ip_address",
                    models.GenericIPAddressField(blank=True, null=True),
                ),
                ("user_agent", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(default=dict)),
                (
                    "timestamp",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        blank=True,
                        db_column="org_id",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="academics.organization",
                    ),
                ),
            ],
            options={
                "db_table": "security_events",
            },
        ),
        migrations.AddIndex(
            model_name="SecurityEvent",
            index=models.Index(
                fields=["event_type", "timestamp"],
                name="sec_event_type_ts_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="SecurityEvent",
            index=models.Index(
                fields=["user", "timestamp"],
                name="sec_event_user_ts_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="SecurityEvent",
            index=models.Index(
                fields=["organization", "timestamp"],
                name="sec_event_org_ts_idx",
            ),
        ),
    ]
