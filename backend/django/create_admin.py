#!/usr/bin/env python
"""
Script to create admin user 'khushi' with password 'm@dhubala'
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp.settings')
django.setup()

from academics.models import User, Organization
from django.db import IntegrityError

def create_admin_user():
    username = 'khushi'
    email = 'khushi@example.com'
    password = 'm@dhubala'
    
    # Check if user already exists
    if User.objects.filter(username=username).exists():
        print(f"❌ User '{username}' already exists!")
        user = User.objects.get(username=username)
        print(f"   User ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.role}")
        print(f"   Organization: {user.organization.org_name if user.organization else 'None'}")
        return
    
    # Get the first organization
    org = Organization.objects.first()
    if not org:
        print("❌ No organization found! Please create an organization first.")
        return
    
    try:
        # Create superuser
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            organization=org,
            role='ADMIN'
        )
        
        print("✓ Admin user created successfully!")
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  Role: ADMIN")
        print(f"  Organization: {org.org_name} ({org.org_code})")
        print(f"  User ID: {user.id}")
        print("\nYou can now log in with these credentials.")
        
    except IntegrityError as e:
        print(f"❌ Error creating user: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == '__main__':
    create_admin_user()
