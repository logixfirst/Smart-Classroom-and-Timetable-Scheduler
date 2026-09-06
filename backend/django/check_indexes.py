import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Check Faculty indexes
    cursor.execute("""
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'academics_faculty' 
        AND indexname LIKE 'idx_%'
    """)
    print("Faculty Indexes:")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")
    
    # Check Student indexes
    cursor.execute("""
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'academics_student' 
        AND indexname LIKE 'idx_%'
    """)
    print("\nStudent Indexes:")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")
    
    # Test query performance
    print("\n--- Testing Query Performance ---")
    
    # Test faculty lookup
    cursor.execute("EXPLAIN ANALYZE SELECT * FROM academics_faculty WHERE faculty_code = 'bhuacc001'")
    result = cursor.fetchall()
    print("\nFaculty lookup by code:")
    for row in result:
        if 'Index Scan' in row[0] or 'Seq Scan' in row[0]:
            print(f"  {row[0]}")
    
    # Test student lookup
    cursor.execute("EXPLAIN ANALYZE SELECT * FROM academics_student WHERE enrollment_number = '21acc001'")
    result = cursor.fetchall()
    print("\nStudent lookup by enrollment:")
    for row in result:
        if 'Index Scan' in row[0] or 'Seq Scan' in row[0]:
            print(f"  {row[0]}")

print("\n✓ Check complete!")
