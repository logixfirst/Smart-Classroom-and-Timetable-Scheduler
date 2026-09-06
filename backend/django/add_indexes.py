"""
Quick script to add missing indexes for faculty and student lookups
Run with: python add_indexes.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

# SQL to create indexes
indexes = [
    "CREATE INDEX IF NOT EXISTS idx_fac_code ON faculty(faculty_code);",
    "CREATE INDEX IF NOT EXISTS idx_fac_username ON faculty(username);",
    "CREATE INDEX IF NOT EXISTS idx_fac_email ON faculty(email);",
    "CREATE INDEX IF NOT EXISTS idx_stu_enrollment ON students(enrollment_number);",
    "CREATE INDEX IF NOT EXISTS idx_stu_roll ON students(roll_number);",
    "CREATE INDEX IF NOT EXISTS idx_stu_username ON students(username);",
]

with connection.cursor() as cursor:
    for sql in indexes:
        print(f"Executing: {sql}")
        cursor.execute(sql)
        print("Done")

print("\nAll indexes created successfully!")
print("Faculty and student lookups should now be much faster.")
