"""
Authentication views: login, logout, token refresh, current user
Industry-standard JWT authentication with HttpOnly cookies
"""

from django.contrib.auth import authenticate
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from ..models import User


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """Secure LOGIN with HttpOnly cookies"""
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username or not password:
        return Response(
            {"error": "Please provide both username and password"},
            status=status.HTTP_400_BAD_REQUEST,
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
        return Response(
            {"error": "Invalid username/email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"error": "User account is disabled"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    # Get user's department if they are faculty or student
    department_info = None

    # Prepare response with user data (NO TOKENS IN BODY)
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
        samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
        domain=None,
        path="/",
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
            path="/",
            domain=None,
            samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
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
            getattr(settings, "JWT_AUTH_REFRESH_COOKIE", "refresh_token"), path="/"
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
                samesite=getattr(settings, "JWT_AUTH_SAMESITE", "Lax"),
                domain=None,
                path="/",
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
