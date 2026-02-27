"""
Password Management Views: reset request, reset confirm, password change.

Separated from auth_views.py by SRP:
  auth_views.py  -> login / logout / token refresh   (session creation)
  password_views.py -> password lifecycle             (credential management)

Each file has exactly one reason to change.
"""
import logging
import secrets

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from ..models import User
from core.audit_logging import log_security_event

logger = logging.getLogger("academics")

_PWD_RESET_TTL = 900  # 15 minutes -- single-use token TTL


def _pwd_reset_cache_key(token: str) -> str:
    """Return the Redis key that maps a reset token -> user UUID."""
    return f"pwd_reset:{token}"


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    """
    Request a password reset token.
    Token is stored in Redis for 15 minutes; single-use.
    Always returns 200 to prevent email enumeration.
    """
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        token = secrets.token_urlsafe(32)
        cache.set(_pwd_reset_cache_key(token), str(user.id), timeout=_PWD_RESET_TTL)
        logger.info(
            "password_reset_requested",
            extra={"user_id": str(user.id), "ip": request.META.get("REMOTE_ADDR")},
        )
        log_security_event("password_reset", request, user=user)
    except User.DoesNotExist:
        pass  # Never reveal whether an email is registered

    return Response(
        {"message": "If that email is registered, a reset link has been sent."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    Confirm a password reset.
    Invalidates the token on success and kills all active sessions.
    """
    token = request.data.get("token", "").strip()
    new_password = request.data.get("new_password", "")

    if not token or not new_password:
        return Response(
            {"error": "token and new_password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_id = cache.get(_pwd_reset_cache_key(token))
    if not user_id:
        return Response(
            {"error": "Invalid or expired token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Invalid or expired token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(new_password, user=user)
    except ValidationError as exc:
        return Response({"error": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    cache.delete(_pwd_reset_cache_key(token))  # single-use: destroy immediately

    # Blacklist all outstanding refresh tokens -- kills every stolen session
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)

    logger.info(
        "password_reset_completed",
        extra={"user_id": str(user.id), "ip": request.META.get("REMOTE_ADDR")},
    )
    return Response(
        {"message": "Password reset successful. Please login again."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def password_change_view(request):
    """
    Change the password for the currently authenticated user.
    Requires the current password to prevent CSRF-style escalation.
    """
    current_password = request.data.get("current_password", "")
    new_password = request.data.get("new_password", "")

    if not current_password or not new_password:
        return Response(
            {"error": "current_password and new_password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user
    if not user.check_password(current_password):
        logger.warning(
            "password_change_wrong_current",
            extra={"user_id": str(user.id), "ip": request.META.get("REMOTE_ADDR")},
        )
        return Response(
            {"error": "Current password incorrect."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(new_password, user=user)
    except ValidationError as exc:
        return Response({"error": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    logger.info(
        "password_changed",
        extra={"user_id": str(user.id), "ip": request.META.get("REMOTE_ADDR")},
    )
    log_security_event("password_changed", request, user=user)
    return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)
