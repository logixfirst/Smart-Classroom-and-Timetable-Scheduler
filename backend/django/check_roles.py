import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT DISTINCT role FROM users;")
    roles = cursor.fetchall()
    print("Existing roles in database:")
    for role in roles:
        print(f"  - {role[0]}")
