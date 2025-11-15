"""
Security utilities and helper functions for Django backend
"""
import hashlib
import secrets
import re
from typing import Optional, Dict, Any
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import logging

logger = logging.getLogger(__name__)


class PasswordValidator:
    """Custom password validator with enhanced security requirements"""

    def __init__(self, min_length=8):
        self.min_length = min_length

    def validate(self, password, user=None):
        """Validate password against security requirements"""
        if len(password) < self.min_length:
            raise ValidationError(
                _(f"Password must be at least {self.min_length} characters long."),
                code="password_too_short",
            )

        if not re.search(r"[A-Z]", password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter."),
                code="password_no_upper",
            )

        if not re.search(r"[a-z]", password):
            raise ValidationError(
                _("Password must contain at least one lowercase letter."),
                code="password_no_lower",
            )

        if not re.search(r"\d", password):
            raise ValidationError(
                _("Password must contain at least one digit."),
                code="password_no_digit",
            )

        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                _("Password must contain at least one special character."),
                code="password_no_special",
            )

        # Check for common passwords
        common_passwords = ["password", "12345678", "qwerty", "admin"]
        if password.lower() in common_passwords:
            raise ValidationError(
                _("This password is too common."),
                code="password_too_common",
            )

        # Check if password contains username
        if user and user.username.lower() in password.lower():
            raise ValidationError(
                _("Password cannot contain your username."),
                code="password_contains_username",
            )

    def get_help_text(self):
        return _(
            f"Your password must contain at least {self.min_length} characters, "
            "including uppercase, lowercase, digits, and special characters."
        )


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token

    Args:
        length: Length of the token (default: 32)

    Returns:
        Secure random token as hex string
    """
    return secrets.token_hex(length)


def hash_sensitive_data(data: str) -> str:
    """
    Hash sensitive data using SHA-256

    Args:
        data: Data to hash

    Returns:
        Hashed data as hex string
    """
    return hashlib.sha256(data.encode()).hexdigest()


def mask_email(email: str) -> str:
    """
    Mask email address for logging/display

    Args:
        email: Email address to mask

    Returns:
        Masked email (e.g., u***@example.com)
    """
    if "@" not in email:
        return email

    local, domain = email.split("@")
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]

    return f"{masked_local}@{domain}"


def sanitize_input(data: str, max_length: int = 500) -> str:
    """
    Sanitize user input to prevent XSS and injection attacks

    Args:
        data: Input string to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    # Remove any HTML tags
    data = re.sub(r"<[^>]*>", "", data)

    # Remove any script tags
    data = re.sub(r"<script.*?>.*?</script>", "", data, flags=re.DOTALL | re.IGNORECASE)

    # Limit length
    data = data[:max_length]

    # Remove any SQL injection attempts
    sql_keywords = ["DROP", "DELETE", "INSERT", "UPDATE", "SELECT", "UNION", "--", ";"]
    for keyword in sql_keywords:
        data = re.sub(rf"\b{keyword}\b", "", data, flags=re.IGNORECASE)

    return data.strip()


def validate_file_upload(file, allowed_extensions: list = None, max_size_mb: int = 10):
    """
    Validate uploaded file for security

    Args:
        file: Uploaded file object
        allowed_extensions: List of allowed file extensions
        max_size_mb: Maximum file size in MB

    Raises:
        ValidationError: If file is invalid
    """
    if allowed_extensions is None:
        allowed_extensions = ["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx"]

    # Check file size
    max_size_bytes = max_size_mb * 1024 * 1024
    if file.size > max_size_bytes:
        raise ValidationError(
            _(f"File size cannot exceed {max_size_mb}MB."), code="file_too_large"
        )

    # Check file extension
    file_extension = file.name.split(".")[-1].lower()
    if file_extension not in allowed_extensions:
        raise ValidationError(
            _(f"File type '.{file_extension}' is not allowed."),
            code="invalid_file_type",
        )

    # Check for double extensions (e.g., file.php.jpg)
    if file.name.count(".") > 1:
        raise ValidationError(
            _("Files with multiple extensions are not allowed."),
            code="multiple_extensions",
        )


def check_rate_limit(
    identifier: str, max_attempts: int = 5, window_seconds: int = 300
) -> bool:
    """
    Check if rate limit has been exceeded

    Args:
        identifier: Unique identifier (e.g., IP address, user ID)
        max_attempts: Maximum allowed attempts
        window_seconds: Time window in seconds

    Returns:
        True if rate limit exceeded, False otherwise
    """
    from django.core.cache import cache

    cache_key = f"rate_limit:{identifier}"
    attempts = cache.get(cache_key, 0)

    if attempts >= max_attempts:
        return True

    cache.set(cache_key, attempts + 1, window_seconds)
    return False


def log_security_event(event_type: str, details: Dict[str, Any], user=None):
    """
    Log security-related events

    Args:
        event_type: Type of security event (e.g., 'login_failed', 'unauthorized_access')
        details: Event details dictionary
        user: User object if available
    """
    log_data = {
        "event_type": event_type,
        "timestamp": details.get("timestamp"),
        "user": str(user) if user else "Anonymous",
        "ip_address": details.get("ip_address"),
        "user_agent": details.get("user_agent"),
        "details": details,
    }

    logger.warning(f"Security Event: {event_type} - {log_data}")


def verify_csrf_token(request) -> bool:
    """
    Verify CSRF token from request

    Args:
        request: Django request object

    Returns:
        True if token is valid, False otherwise
    """
    from django.middleware.csrf import get_token

    csrf_token = request.META.get("HTTP_X_CSRFTOKEN") or request.POST.get(
        "csrfmiddlewaretoken"
    )
    expected_token = get_token(request)

    return csrf_token == expected_token


class SecurityHeaders:
    """Security headers middleware helper"""

    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get recommended security headers"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        }


def encrypt_sensitive_field(data: str, key: Optional[str] = None) -> str:
    """
    Encrypt sensitive field data

    Args:
        data: Data to encrypt
        key: Encryption key (uses SECRET_KEY if not provided)

    Returns:
        Encrypted data as base64 string
    """
    from cryptography.fernet import Fernet
    import base64

    if key is None:
        # Derive key from Django SECRET_KEY
        key = base64.urlsafe_b64encode(
            hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        )

    f = Fernet(key)
    return f.encrypt(data.encode()).decode()


def decrypt_sensitive_field(encrypted_data: str, key: Optional[str] = None) -> str:
    """
    Decrypt sensitive field data

    Args:
        encrypted_data: Encrypted data as base64 string
        key: Encryption key (uses SECRET_KEY if not provided)

    Returns:
        Decrypted data
    """
    from cryptography.fernet import Fernet
    import base64

    if key is None:
        # Derive key from Django SECRET_KEY
        key = base64.urlsafe_b64encode(
            hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        )

    f = Fernet(key)
    return f.decrypt(encrypted_data.encode()).decode()
