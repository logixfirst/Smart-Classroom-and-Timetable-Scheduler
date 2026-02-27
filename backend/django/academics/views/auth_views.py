"""
Authentication views: login, logout, token refresh, current user
Industry-standard JWT authentication with HttpOnly cookies
"""

import hashlib
import logging

from django.contrib.auth import authenticate
from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.throttling import LoginRateThrottle
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from ..models import User, UserSession
from core.audit_logging import log_security_event

logger = logging.getLogger("academics")

_LOCKOUT_MAX_ATTEMPTS = getattr(settings, "LOGIN_MAX_ATTEMPTS", 5)
_LOCKOUT_WINDOW_SECONDS = getattr(settings, "LOGIN_LOCKOUT_SECONDS", 900)  # 15 min


def _get_device_fingerprint(request) -> str:
    """
    Derive a short device fingerprint from the User-Agent header.
    Returns the first 16 hex chars of SHA-256(user_agent).
    Pure function -- no DB calls, no side effects.
    """
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    return hashlib.sha256(user_agent.encode("utf-8", errors="replace")).hexdigest()[:16]


def _get_client_ip(request) -> str:
    """Return the real client IP, trusting X-Forwarded-For from reverse proxy."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _lockout_cache_key(username: str) -> str:
    """Return the Redis key used to count failed login attempts."""
    return f"login_attempts:{username.lower()}"


def _record_failed_attempt(username: str) -> int:
    """
    Increment the failed-attempt counter for *username*.
    Returns the new attempt count.
    Uses cache.add so the expiry is only set on first failure;
    subsequent increments leave the original TTL intact.
    """
    key = _lockout_cache_key(username)
    cache.add(key, 0, timeout=_LOCKOUT_WINDOW_SECONDS)
    new_count: int = cache.incr(key)
    logger.warning(
        "Failed login attempt",
        extra={"username": username, "attempt": new_count, "max": _LOCKOUT_MAX_ATTEMPTS},
    )
    return new_count


def _is_account_locked(username: str) -> bool:
    """Return True if *username* has reached the failed-attempt threshold."""
    count = cache.get(_lockout_cache_key(username), default=0)
    return count >= _LOCKOUT_MAX_ATTEMPTS


def _clear_failed_attempts(username: str) -> None:
    """Delete the failed-attempt counter after a successful login."""
    cache.delete(_lockout_cache_key(username))


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    """Secure LOGIN with HttpOnly cookies"""
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username or not password:
        return Response(
            {"error": "Please provide both username and password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Per-account lockout check (bypasses IP rotation)
    if _is_account_locked(username):
        logger.warning(
            "Login blocked -- account locked",
            extra={"username": username},
        )
        log_security_event("login_locked", request, metadata={"username": username})
        return Response(
            {"error": "Account temporarily locked due to too many failed attempts. Try again in 15 minutes."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Try authenticating with username first
    user = authenticate(username=username, password=password)

    # If failed and username looks like email, try finding user by email
    if user is None and "@" in username:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass

    if user is None:
        _record_failed_attempt(username)
        log_security_event("login_failure", request, metadata={"username": username})
        return Response(
            {"error": "Invalid username/email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"error": "User account is disabled"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Successful login -- clear any previous failure counter
    _clear_failed_attempts(username)

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    refresh["device_fp"] = _get_device_fingerprint(request)  # FIX 1: device fingerprint claim
    refresh_jti = str(refresh["jti"])                         # FIX 1: refresh token JTI
    refresh.access_token["session_jti"] = refresh_jti         # FIX 1: link access -> session
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    # Create session record (FIX 1 PART B)
    UserSession.objects.create(
        user=user,
        jti=refresh_jti,
        device_info=request.META.get("HTTP_USER_AGENT", "")[:255],
        ip_address=_get_client_ip(request),
        organization=user.organization,
    )
    log_security_event("login_success", request, user=user, metadata={"username": user.username})

    # Prepare response with user data (NO TOKENS IN BODY)
    # Get user's department if they are faculty or student
    department_info = None
    response = Response(
        {
            "message": "Login successful",
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "department": department_info,
                "is_active": user.is_active,
                "organization": user.organization.org_name
                if user.organization
                else None,
            },
        },
        status=status.HTTP_200_OK,
    )

    # Set tokens in HttpOnly Secure cookies
    response.set_cookie(
        key=getattr(settings, "JWT_AUTH_COOKIE", "access_token"),
        value=access_token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        secure=getattr(settings, "JWT_AUTH_SECURE", not settings.DEBUG),
        httponly=getattr(settings, "JWT_AUTH_HTTPONLY", True),
        samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
        domain=None,
        path="/",
    )

    response.set_cookie(
        key=getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"),
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        secure=getattr(settings, "JWT_AUTH_SECURE", not settings.DEBUG),
        httponly=getattr(settings, "JWT_AUTH_HTTPONLY", True),
        samesite="Strict",  # Refresh token never needs cross-site access
        domain=None,
        path=getattr(settings, "JWT_AUTH_REFRESH_COOKIE_PATH", "/api/auth/refresh/"),
    )

    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Secure LOGOUT with Token Blacklisting"""
    try:
        refresh_token = request.COOKIES.get(
            getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token")
        )

        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
            # FIX 1 PART D: deactivate session for this refresh token
            UserSession.objects.filter(jti=str(token["jti"]), user=request.user).update(is_active=False)

        log_security_event("logout", request, user=request.user)
        response = Response(
            {"message": "Successfully logged out"}, status=status.HTTP_200_OK
        )

        # Delete both cookies
        response.delete_cookie(
            key=getattr(settings, "JWT_AUTH_COOKIE", "access_token"),
            path="/",
            domain=None,
            samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
        )

        response.delete_cookie(
            key=getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"),
            # Must match the path the cookie was set with, or browser ignores the deletion
            path=getattr(settings, "JWT_AUTH_REFRESH_COOKIE_PATH", "/api/auth/refresh/"),
            domain=None,
            samesite="Strict",
        )

        return response

    except TokenError:
        response = Response(
            {"message": "Logged out (token already invalid)"}, status=status.HTTP_200_OK
        )
        response.delete_cookie(
            getattr(settings, "JWT_AUTH_COOKIE", "access_token"), path="/"
        )
        response.delete_cookie(
            getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"),
            path=getattr(settings, "JWT_AUTH_REFRESH_COOKIE_PATH", "/api/auth/refresh/"),
        )
        return response

    except Exception as e:
        return Response(
            {"error": f"Logout failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current authenticated user details"""
    user = request.user

    department_info = None

    return Response(
        {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "department": department_info,
            "is_active": user.is_active,
            "organization": user.organization.org_name if user.organization else None,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """REFRESH TOKEN with Rotation & Blacklisting"""
    try:
        refresh_token_str = request.COOKIES.get(
            getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token")
        )

        if not refresh_token_str:
            return Response(
                {"error": "Refresh token not found. Please login again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh_token = RefreshToken(refresh_token_str)

        # FIX 1: Reject tokens whose device fingerprint has changed
        stored_fp = refresh_token.get("device_fp", None)
        current_fp = _get_device_fingerprint(request)
        if stored_fp and stored_fp != current_fp:
            refresh_token.blacklist()
            logger.warning(
                "token_device_mismatch",
                extra={
                    "user_id": refresh_token.get("user_id"),
                    "ip": request.META.get("REMOTE_ADDR"),
                    "stored_fp": stored_fp,
                    "current_fp": current_fp,
                },
            )
            log_security_event(
                "token_mismatch", request,
                metadata={"stored_fp": stored_fp, "current_fp": current_fp},
            )
            return Response(
                {"error": "Session invalid. Please login again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        new_access_token = str(refresh_token.access_token)
        new_refresh_token = str(refresh_token)

        response = Response(
            {"message": "Token refreshed successfully"}, status=status.HTTP_200_OK
        )

        response.set_cookie(
            key=getattr(settings, "JWT_AUTH_COOKIE", "access_token"),
            value=new_access_token,
            max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
            secure=getattr(settings, "JWT_AUTH_SECURE", not settings.DEBUG),
            httponly=getattr(settings, "JWT_AUTH_HTTPONLY", True),
            samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
            domain=None,
            path="/",
        )

        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
            response.set_cookie(
                key=getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"),
                value=new_refresh_token,
                max_age=int(
                    settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
                ),
                secure=getattr(settings, "JWT_AUTH_SECURE", not settings.DEBUG),
                httponly=getattr(settings, "JWT_AUTH_HTTPONLY", True),
                samesite="Strict",  # Refresh token never needs cross-site access
                domain=None,
                path=getattr(settings, "JWT_AUTH_REFRESH_COOKIE_PATH", "/api/auth/refresh/"),
            )

        return response

    except (TokenError, InvalidToken) as e:
        return Response(
            {"error": "Invalid or expired refresh token. Please login again."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except Exception as e:
        return Response(
            {"error": f"Token refresh failed: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
