"""
Verify indexes were created
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

sql = """
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('faculty', 'students') 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
"""

with connection.cursor() as cursor:
    cursor.execute(sql)
    results = cursor.fetchall()
    
    print("Indexes on faculty and students tables:")
    print("-" * 50)
    for index_name, table_name in results:
        print(f"{table_name:15} | {index_name}")
    print("-" * 50)
    print(f"Total: {len(results)} indexes")
