"""
Session Management Views: list active sessions, revoke a specific session.

Separated from auth_views.py by SRP:
  auth_views.py   -> login / logout / token refresh  (session creation/teardown)
  session_views.py -> session inventory management   (multi-device visibility)

Each file has exactly one reason to change.
"""
import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from ..models import UserSession

logger = logging.getLogger("academics")


def _get_client_ip(request) -> str:
    """Return the real client IP, trusting X-Forwarded-For from reverse proxy."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _resolve_current_session_jti(request) -> str | None:
    """
    Extract the session JTI from the current access token cookie.
    Returns None if the cookie is absent or the token is malformed.
    """
    from rest_framework_simplejwt.tokens import AccessToken
    access_cookie = request.COOKIES.get(
        getattr(settings, "JWT_AUTH_COOKIE", "access_token")
    )
    if not access_cookie:
        return None
    try:
        return AccessToken(access_cookie).get("session_jti")
    except Exception:
        return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sessions_view(request):
    """
    List all active sessions for the authenticated user.
    Marks the current session so the UI can highlight it.
    """
    current_session_jti = _resolve_current_session_jti(request)

    sessions = (
        UserSession.objects
        .filter(user=request.user, is_active=True)
        .order_by("-last_active")
        .values("jti", "device_info", "ip_address", "created_at", "last_active")
    )
    results = [
        {
            "jti": s["jti"],
            "jti_display": s["jti"][-8:],   # last 8 chars for safe UI display
            "device_info": s["device_info"],
            "ip_address": s["ip_address"],
            "created_at": s["created_at"],
            "last_active": s["last_active"],
            "is_current": s["jti"] == current_session_jti,
        }
        for s in sessions
    ]
    return Response({"sessions": results}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def revoke_session_view(request, jti: str):
    """
    Revoke a specific active session by its JTI.
    IDOR-safe: validates that the session belongs to the requesting user.
    """
    try:
        session = UserSession.objects.get(jti=jti, is_active=True)
    except UserSession.DoesNotExist:
        return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

    # IDOR protection -- only the session owner may revoke it
    if session.user_id != request.user.id:
        logger.warning(
            "session_revoke_idor_attempt",
            extra={
                "requester": str(request.user.id),
                "owner": str(session.user_id),
                "jti": jti,
            },
        )
        return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

    session.is_active = False
    session.save(update_fields=["is_active"])

    # Blacklist the corresponding refresh token in SimpleJWT
    for outstanding in OutstandingToken.objects.filter(jti=jti):
        BlacklistedToken.objects.get_or_create(token=outstanding)

    logger.info(
        "session_revoked",
        extra={
            "user_id": str(request.user.id),
            "jti": jti,
            "ip": _get_client_ip(request),
        },
    )
    return Response({"message": "Session revoked."}, status=status.HTTP_200_OK)
