"""
Custom permissions for role-based access control (RBAC)
"""
from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsAdmin(permissions.BasePermission):
    """
    Permission to only allow admin users
    """

    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsStaff(permissions.BasePermission):
    """
    Permission to only allow staff users
    """

    message = "Only staff members can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ["admin", "staff"]
        )


class IsFaculty(permissions.BasePermission):
    """
    Permission to only allow faculty users
    """

    message = "Only faculty members can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ["admin", "staff", "faculty"]
        )


class IsStudent(permissions.BasePermission):
    """
    Permission to only allow student users
    """

    message = "Only students can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow owners of an object or admins
    """

    message = "You do not have permission to modify this resource."

    def has_object_permission(self, request, view, obj):
        # Admin can access everything
        if request.user.role == "admin":
            return True

        # Check if object has an owner/creator field
        if hasattr(obj, "created_by"):
            return obj.created_by == request.user
        elif hasattr(obj, "user"):
            return obj.user == request.user
        elif hasattr(obj, "owner"):
            return obj.owner == request.user

        return False


class ReadOnly(permissions.BasePermission):
    """
    Permission for read-only access (GET, HEAD, OPTIONS)
    """

    message = "This resource is read-only."

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Admin can modify, others can only read
    """

    message = "Only administrators can modify this resource."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class CanManageTimetable(permissions.BasePermission):
    """
    Permission for managing timetables (admin and staff only)
    """

    message = "Only administrators and staff can manage timetables."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ["admin", "staff"]
        )


class CanApproveTimetable(permissions.BasePermission):
    """
    Permission for approving timetables (admin only)
    """

    message = "Only administrators can approve timetables."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class DepartmentBasedPermission(permissions.BasePermission):
    """
    Permission based on department access
    """

    message = "You do not have access to this department's resources."

    def has_object_permission(self, request, view, obj):
        # Admin can access everything
        if request.user.role == "admin":
            return True

        # Staff and faculty can only access their department
        if request.user.role in ["staff", "faculty"]:
            if hasattr(obj, "department"):
                return obj.department.department_id == request.user.department
            elif hasattr(obj, "department_id"):
                return obj.department_id == request.user.department

        return False


class CanManageFaculty(permissions.BasePermission):
    """
    Permission for managing faculty (admin and department staff)
    """

    message = "You do not have permission to manage faculty."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ["admin", "staff"]
        )

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True

        # Staff can only manage faculty in their department
        if request.user.role == "staff":
            return obj.department.department_id == request.user.department

        return False


class CanViewStudentData(permissions.BasePermission):
    """
    Permission for viewing student data
    """

    message = "You do not have permission to view student data."

    def has_permission(self, request, view):
        # Admin, staff, and faculty can view
        if request.user.role in ["admin", "staff", "faculty"]:
            return True

        # Students can only view their own data
        if request.user.role == "student":
            return True

        return False

    def has_object_permission(self, request, view, obj):
        # Admin, staff, and faculty can view all
        if request.user.role in ["admin", "staff", "faculty"]:
            return True

        # Students can only view their own data
        if request.user.role == "student":
            return obj.student_id == request.user.username

        return False


class CanManageAttendance(permissions.BasePermission):
    """
    Permission for managing attendance (faculty and staff)
    """

    message = "Only faculty and staff can manage attendance."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ["admin", "staff", "faculty"]
        )


class CanSubmitLeaveRequest(permissions.BasePermission):
    """
    Permission for submitting leave requests (faculty only)
    """

    message = "Only faculty members can submit leave requests."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "faculty"
        )


class CanApproveLeaveRequest(permissions.BasePermission):
    """
    Permission for approving leave requests (admin and staff)
    """

    message = "Only administrators and staff can approve leave requests."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ["admin", "staff"]
        )


def check_role_permission(user, required_roles: list) -> bool:
    """
    Helper function to check if user has required role

    Args:
        user: User object
        required_roles: List of allowed roles

    Returns:
        True if user has permission, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    return user.role in required_roles


def check_department_permission(user, department_id: str) -> bool:
    """
    Helper function to check if user has access to department

    Args:
        user: User object
        department_id: Department ID to check

    Returns:
        True if user has permission, False otherwise
    """
    if not user or not user.is_authenticated:
        return False

    # Admin has access to all departments
    if user.role == "admin":
        return True

    # Staff and faculty can only access their department
    if user.role in ["staff", "faculty"]:
        return user.department == department_id

    return False
