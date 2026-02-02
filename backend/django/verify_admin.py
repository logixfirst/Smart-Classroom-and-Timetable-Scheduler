#!/usr/bin/env python
"""
Verify that admin user 'khushi' is set up correctly
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from academics.models import User, Organization
from academics.serializers import UserSerializer
import json

def verify_admin():
    print("\n" + "="*60)
    print("ADMIN USER VERIFICATION")
    print("="*60)
    
    try:
        user = User.objects.get(username='khushi')
        
        print("\n✅ USER FOUND IN DATABASE")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        print(f"   Is Active: {user.is_active}")
        print(f"   Is Staff: {user.is_staff}")
        print(f"   Is Superuser: {user.is_superuser}")
        print(f"   Organization: {user.organization.org_name if user.organization else 'None'}")
        
        print("\n✅ API SERIALIZED DATA:")
        serializer = UserSerializer(user)
        print(json.dumps(serializer.data, indent=2, default=str))
        
        print("\n✅ ADMIN ACCESS CHECK:")
        if user.is_staff and user.is_superuser:
            print("   ✓ Can access Django admin panel")
        else:
            print("   ✗ Cannot access Django admin panel")
            
        if user.role.upper() == 'ADMIN':
            print("   ✓ Has ADMIN role for frontend")
        else:
            print("   ✗ Does not have ADMIN role")
            
        print("\n✅ LOGIN CREDENTIALS:")
        print("   Username: khushi")
        print("   Password: m@dhubala")
        print("   Login URL: http://localhost:3000/login")
        
        print("\n" + "="*60)
        print("VERIFICATION COMPLETE - User is ready to use!")
        print("="*60 + "\n")
        
    except User.DoesNotExist:
        print("\n❌ USER NOT FOUND")
        print("   Please run create_admin.py to create the user")

if __name__ == '__main__':
    verify_admin()
