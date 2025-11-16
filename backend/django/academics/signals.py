"""
Django Signals for Automatic User <-> Faculty <-> Student Synchronization

This module implements bidirectional data synchronization between User, Faculty, and Student models
using Django's signal framework. Changes to any model automatically propagate to related models.

Key Features:
- Automatic User creation when Faculty/Student is created
- Bidirectional sync: User ↔ Faculty, User ↔ Student
- Email-based linking (email is the unique identifier)
- Transaction-safe operations
- Bulk operation support
"""

from django.db import transaction
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.cache import cache
from .models import User, Faculty, Student
import logging

logger = logging.getLogger(__name__)


# ============================================
# User -> Faculty/Student Sync Signals
# ============================================

@receiver(post_save, sender=User)
def sync_user_to_faculty_student(sender, instance, created, **kwargs):
    """
    Automatically sync User changes to Faculty/Student models.
    When a User is created or updated, update corresponding Faculty/Student records.
    """
    if kwargs.get('raw', False):
        # Skip during loaddata/fixtures
        return
    
    try:
        with transaction.atomic():
            # Check if this user is a faculty member
            if instance.role == 'faculty':
                faculty = Faculty.objects.filter(email=instance.email).first()
                if faculty:
                    # Update existing faculty record
                    faculty.faculty_name = f"{instance.first_name} {instance.last_name}".strip()
                    faculty.save()
                    logger.info(f"Updated faculty {faculty.faculty_id} from user {instance.username}")
                elif created:
                    # Create faculty record for new faculty user (optional - can be manual)
                    logger.info(f"Faculty user {instance.username} created, but no Faculty record exists yet")
            
            # Check if this user is a student
            elif instance.role == 'student':
                student = Student.objects.filter(email=instance.email).first()
                if student:
                    # Update existing student record
                    student.name = f"{instance.first_name} {instance.last_name}".strip()
                    student.save()
                    logger.info(f"Updated student {student.student_id} from user {instance.username}")
                elif created:
                    # Create student record for new student user (optional - can be manual)
                    logger.info(f"Student user {instance.username} created, but no Student record exists yet")
            
            # Invalidate related caches
            _invalidate_user_caches(instance.email)
            
    except Exception as e:
        logger.error(f"Error syncing user {instance.username} to Faculty/Student: {str(e)}")


# ============================================
# Faculty -> User Sync Signals
# ============================================

@receiver(post_save, sender=Faculty)
def sync_faculty_to_user(sender, instance, created, **kwargs):
    """
    Automatically create or update User when Faculty is created/updated.
    Ensures every faculty member has a corresponding user account.
    """
    if kwargs.get('raw', False):
        return
    
    try:
        with transaction.atomic():
            # Check if user exists
            user = User.objects.filter(email=instance.email).first()
            
            if user:
                # Update existing user
                if user.role != 'faculty':
                    user.role = 'faculty'
                names = instance.faculty_name.split(' ', 1)
                user.first_name = names[0] if names else ''
                user.last_name = names[1] if len(names) > 1 else ''
                user.save()
                logger.info(f"Updated user {user.username} from faculty {instance.faculty_id}")
            else:
                # Create new user for faculty
                username = instance.email.split('@')[0]
                # Check if username exists, make it unique
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                names = instance.faculty_name.split(' ', 1)
                user = User.objects.create(
                    username=username,
                    email=instance.email,
                    first_name=names[0] if names else '',
                    last_name=names[1] if len(names) > 1 else '',
                    role='faculty',
                    is_active=True
                )
                user.set_password('changeme123')  # Default password, should be changed
                user.save()
                logger.info(f"Created user {user.username} for faculty {instance.faculty_id}")
            
            # Invalidate related caches
            _invalidate_user_caches(instance.email)
            
    except Exception as e:
        logger.error(f"Error syncing faculty {instance.faculty_id} to User: {str(e)}")


@receiver(post_delete, sender=Faculty)
def delete_faculty_user(sender, instance, **kwargs):
    """
    When Faculty is deleted, optionally delete corresponding User account.
    This keeps the system clean but can be disabled if you want to preserve user accounts.
    """
    try:
        user = User.objects.filter(email=instance.email, role='faculty').first()
        if user:
            user.delete()
            logger.info(f"Deleted user {user.username} for faculty {instance.faculty_id}")
            _invalidate_user_caches(instance.email)
    except Exception as e:
        logger.error(f"Error deleting user for faculty {instance.faculty_id}: {str(e)}")


# ============================================
# Student -> User Sync Signals
# ============================================

@receiver(post_save, sender=Student)
def sync_student_to_user(sender, instance, created, **kwargs):
    """
    Automatically create or update User when Student is created/updated.
    Ensures every student has a corresponding user account.
    """
    if kwargs.get('raw', False):
        return
    
    try:
        with transaction.atomic():
            # Check if user exists
            user = User.objects.filter(email=instance.email).first()
            
            if user:
                # Update existing user
                if user.role != 'student':
                    user.role = 'student'
                names = instance.name.split(' ', 1)
                user.first_name = names[0] if names else ''
                user.last_name = names[1] if len(names) > 1 else ''
                user.save()
                logger.info(f"Updated user {user.username} from student {instance.student_id}")
            else:
                # Create new user for student
                username = instance.email.split('@')[0]
                # Check if username exists, make it unique
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                names = instance.name.split(' ', 1)
                user = User.objects.create(
                    username=username,
                    email=instance.email,
                    first_name=names[0] if names else '',
                    last_name=names[1] if len(names) > 1 else '',
                    role='student',
                    is_active=True
                )
                user.set_password('changeme123')  # Default password, should be changed
                user.save()
                logger.info(f"Created user {user.username} for student {instance.student_id}")
            
            # Invalidate related caches
            _invalidate_user_caches(instance.email)
            
    except Exception as e:
        logger.error(f"Error syncing student {instance.student_id} to User: {str(e)}")


@receiver(post_delete, sender=Student)
def delete_student_user(sender, instance, **kwargs):
    """
    When Student is deleted, optionally delete corresponding User account.
    This keeps the system clean but can be disabled if you want to preserve user accounts.
    """
    try:
        user = User.objects.filter(email=instance.email, role='student').first()
        if user:
            user.delete()
            logger.info(f"Deleted user {user.username} for student {instance.student_id}")
            _invalidate_user_caches(instance.email)
    except Exception as e:
        logger.error(f"Error deleting user for student {instance.student_id}: {str(e)}")


# ============================================
# Cache Invalidation Helper
# ============================================

def _invalidate_user_caches(email):
    """
    Invalidate all caches related to a user by email.
    Uses pattern-based cache invalidation for Redis.
    """
    try:
        # Invalidate user-related cache patterns
        cache_patterns = [
            'sih28:api:user:*',
            'sih28:api:faculty:*',
            'sih28:api:student:*',
            f'sih28:api:*:{email}',
        ]
        
        for pattern in cache_patterns:
            # Redis pattern-based deletion
            try:
                keys = cache._cache.keys(pattern)
                if keys:
                    cache.delete_many(keys)
            except AttributeError:
                # Not using Redis cache backend
                pass
                
    except Exception as e:
        logger.warning(f"Error invalidating caches for {email}: {str(e)}")


# ============================================
# Bulk Operations Support
# ============================================

def bulk_sync_users_to_faculty_students():
    """
    Utility function to sync all existing Users to Faculty/Student records.
    Useful for initial data migration or fixing inconsistencies.
    
    Usage:
        from academics.signals import bulk_sync_users_to_faculty_students
        bulk_sync_users_to_faculty_students()
    """
    synced_count = 0
    
    with transaction.atomic():
        # Sync faculty users
        faculty_users = User.objects.filter(role='faculty')
        for user in faculty_users:
            faculty = Faculty.objects.filter(email=user.email).first()
            if faculty:
                faculty.faculty_name = f"{user.first_name} {user.last_name}".strip()
                faculty.save()
                synced_count += 1
        
        # Sync student users
        student_users = User.objects.filter(role='student')
        for user in student_users:
            student = Student.objects.filter(email=user.email).first()
            if student:
                student.name = f"{user.first_name} {user.last_name}".strip()
                student.save()
                synced_count += 1
    
    logger.info(f"Bulk sync completed: {synced_count} records updated")
    return synced_count


def bulk_create_users_from_faculty_students():
    """
    Utility function to create User accounts for all Faculty/Student records
    that don't have corresponding user accounts yet.
    
    Usage:
        from academics.signals import bulk_create_users_from_faculty_students
        bulk_create_users_from_faculty_students()
    """
    created_count = 0
    
    with transaction.atomic():
        # Create users for faculty without user accounts
        for faculty in Faculty.objects.all():
            if not User.objects.filter(email=faculty.email).exists():
                username = faculty.email.split('@')[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                names = faculty.faculty_name.split(' ', 1)
                User.objects.create(
                    username=username,
                    email=faculty.email,
                    first_name=names[0] if names else '',
                    last_name=names[1] if len(names) > 1 else '',
                    role='faculty',
                    is_active=True,
                    password='pbkdf2_sha256$600000$changeme123'
                )
                created_count += 1
        
        # Create users for students without user accounts
        for student in Student.objects.all():
            if not User.objects.filter(email=student.email).exists():
                username = student.email.split('@')[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                names = student.name.split(' ', 1)
                User.objects.create(
                    username=username,
                    email=student.email,
                    first_name=names[0] if names else '',
                    last_name=names[1] if len(names) > 1 else '',
                    role='student',
                    is_active=True,
                    password='pbkdf2_sha256$600000$changeme123'
                )
                created_count += 1
    
    logger.info(f"Bulk user creation completed: {created_count} users created")
    return created_count
