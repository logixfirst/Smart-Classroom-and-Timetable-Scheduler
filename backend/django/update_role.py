import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Drop old constraint
    cursor.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;")
    print("[OK] Dropped old role constraint")
    
    # Update all existing roles to new format
    cursor.execute("UPDATE users SET role = LOWER(role);")
    print("[OK] Converted all roles to lowercase")
    
    # Map old 'admin' role to 'org_admin'
    cursor.execute("UPDATE users SET role = 'org_admin' WHERE role = 'admin';")
    print("[OK] Mapped 'admin' to 'org_admin'")
    
    # Update specific user to org_admin
    cursor.execute("UPDATE users SET role = 'org_admin' WHERE username = '21mlt070';")
    print("[OK] Updated user 21mlt070 to org_admin")
    
    # Add new constraint with updated roles
    cursor.execute("""
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('super_admin', 'org_admin', 'dean', 'hod', 'faculty', 'student'));
    """)
    print("[OK] Added new role constraint")
    
    # Verify
    cursor.execute("SELECT username, role FROM users WHERE username = '21mlt070';")
    result = cursor.fetchone()
    print(f"\nCurrent user: {result[0]}, Role: {result[1]}")

print("\n[OK] All done! Backend restart karo aur test karo.")
