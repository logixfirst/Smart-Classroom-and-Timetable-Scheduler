"""
Migration: Add composite index on Student(organization, is_active).

Performance fix: dashboard_stats and student list views filter by
(org_id, is_active). Without this index the query was a full sequential
scan across 19 000+ rows on a remote SSL database.

Expected: COUNT(*) drops from ~30 s → <50 ms on the org-filtered path.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("academics", "0012_add_user_session"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="student",
            index=models.Index(
                fields=["organization", "is_active"],
                name="idx_student_org_active",
            ),
        ),
    ]
