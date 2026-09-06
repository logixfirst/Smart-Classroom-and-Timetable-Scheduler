import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get all table names
    cursor.execute("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE '%faculty%' OR tablename LIKE '%student%'
    """)
    print("Tables:")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")
    
    # Get all indexes
    cursor.execute("""
        SELECT tablename, indexname FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND (tablename LIKE '%faculty%' OR tablename LIKE '%student%')
        ORDER BY tablename, indexname
    """)
    print("\nIndexes:")
    current_table = None
    for row in cursor.fetchall():
        if row[0] != current_table:
            current_table = row[0]
            print(f"\n{row[0]}:")
        print(f"  - {row[1]}")

print("\n✓ Done!")
