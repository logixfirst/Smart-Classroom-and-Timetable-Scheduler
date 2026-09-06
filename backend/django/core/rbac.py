"""
Basic RBAC System for Timetable Management
3 Roles: Registrar, Department Head, Coordinator
"""
from rest_framework import permissions
from functools import wraps
from django.http import JsonResponse


# ============================================
# ROLE DEFINITIONS
# ============================================

class Role:
    """Role constants"""
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    DEAN = "dean"
    HOD = "hod"
    FACULTY = "faculty"
    STUDENT = "student"
    
    # Legacy aliases for backward compatibility
    REGISTRAR = ORG_ADMIN  # Registrar is now org_admin
    DEPT_HEAD = HOD        # Department Head is now hod
    COORDINATOR = FACULTY  # Coordinator is now faculty
    
    ALL_ROLES = [SUPER_ADMIN, ORG_ADMIN, DEAN, HOD, FACULTY, STUDENT]


# ============================================
# PERMISSIONS
# ============================================

class IsRegistrar(permissions.BasePermission):
    """Only Admin (org_admin or super_admin) can access"""
    message = "Only Admin can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [Role.SUPER_ADMIN, Role.ORG_ADMIN]
        )


class IsDepartmentHead(permissions.BasePermission):
    """Only HOD can access"""
    message = "Only Head of Department can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.HOD
        )


class IsCoordinator(permissions.BasePermission):
    """Only Faculty can access"""
    message = "Only Faculty can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.FACULTY
        )


class CanManageTimetable(permissions.BasePermission):
    """Admin, Dean, and HOD can manage timetables"""
    message = "Only Admin, Dean, and HOD can manage timetables."
    
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD]
        )


class CanViewTimetable(permissions.BasePermission):
    """All roles can view timetables"""
    message = "Authentication required to view timetables."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class CanApproveTimetable(permissions.BasePermission):
    """Only Admin (super_admin or org_admin) can approve timetables"""
    message = "Only Admin can approve timetables."
    
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [Role.SUPER_ADMIN, Role.ORG_ADMIN]
        )


class DepartmentAccessPermission(permissions.BasePermission):
    """Department-level access control"""
    message = "You do not have access to this department's resources."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super Admin and Org Admin have access to all
        if request.user.role in [Role.SUPER_ADMIN, Role.ORG_ADMIN]:
            return True
        
        # Dept Head and Coordinator need department_id
        department_id = request.query_params.get('department_id') or request.data.get('department_id')
        if not department_id:
            return False
        
        # Check if user has access to this department
        return has_department_access(request.user, department_id)
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super Admin and Org Admin have access to all
        if request.user.role in [Role.SUPER_ADMIN, Role.ORG_ADMIN]:
            return True
        
        # Check department access
        department_id = getattr(obj, 'department_id', None)
        if not department_id:
            return False
        
        return has_department_access(request.user, department_id)


# ============================================
# HELPER FUNCTIONS
# ============================================

def has_department_access(user, department_id: str) -> bool:
    """Check if user has access to department"""
    if not user or not user.is_authenticated:
        return False
    
    # Super Admin and Org Admin have access to all departments
    if user.role in [Role.SUPER_ADMIN, Role.ORG_ADMIN]:
        return True
    
    # Dean, HOD, and Faculty can only access their department
    if user.role in [Role.DEAN, Role.HOD, Role.FACULTY]:
        return str(user.department) == str(department_id)
    
    return False


def check_role(user, required_roles: list) -> bool:
    """Check if user has required role"""
    if not user or not user.is_authenticated:
        return False
    
    return user.role in required_roles


# ============================================
# DECORATORS
# ============================================

def require_role(*roles):
    """Decorator to require specific roles"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            if request.user.role not in roles:
                return JsonResponse({'error': 'Insufficient permissions'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_department_access(view_func):
    """Decorator to require department access"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        # Super Admin and Org Admin have access to all
        if request.user.role in [Role.SUPER_ADMIN, Role.ORG_ADMIN]:
            return view_func(request, *args, **kwargs)
        
        # Get department_id from request
        department_id = (
            request.GET.get('department_id') or
            request.POST.get('department_id') or
            kwargs.get('department_id')
        )
        
        if not department_id:
            return JsonResponse({'error': 'Department ID required'}, status=400)
        
        if not has_department_access(request.user, department_id):
            return JsonResponse({'error': 'Access denied to this department'}, status=403)
        
        return view_func(request, *args, **kwargs)
    return wrapper


# ============================================
# PERMISSION MATRIX
# ============================================

PERMISSION_MATRIX = {
    'generate_timetable': [Role.SUPER_ADMIN, Role.ORG_ADMIN],
    'approve_timetable': [Role.SUPER_ADMIN, Role.ORG_ADMIN],
    'view_timetable': [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD, Role.FACULTY],
    'edit_timetable': [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD],
    'view_department_timetable': [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD, Role.FACULTY],
    'manage_faculty': [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD],
    'manage_courses': [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD],
    'manage_rooms': [Role.SUPER_ADMIN, Role.ORG_ADMIN],
    'view_conflicts': [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD, Role.FACULTY],
    'resolve_conflicts': [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.DEAN, Role.HOD],
}


def has_permission(user, action: str) -> bool:
    """Check if user has permission for action"""
    if not user or not user.is_authenticated:
        return False
    
    allowed_roles = PERMISSION_MATRIX.get(action, [])
    return user.role in allowed_roles
