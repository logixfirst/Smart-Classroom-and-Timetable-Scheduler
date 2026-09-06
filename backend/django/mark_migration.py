"""
Mark migration 0015 as applied
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

sql = "INSERT INTO django_migrations (app, name, applied) VALUES ('academics', '0015_add_lookup_indexes', NOW());"

with connection.cursor() as cursor:
    print(f"Marking migration 0015 as applied...")
    cursor.execute(sql)
    print("Done!")

print("\nMigration 0015 marked as applied.")
print("Faculty and student lookups are now optimized with indexes.")
