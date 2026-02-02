import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT conname, pg_get_constraintdef(oid) 
        FROM pg_constraint 
        WHERE conrelid = 'users'::regclass AND contype = 'c';
    """)
    print('Constraints on users table:')
    for row in cursor.fetchall():
        print(f'{row[0]}: {row[1]}')
