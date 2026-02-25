"""
DRF Throttle classes for endpoint-specific rate limiting.

Kept in a dedicated module per DRF/Django convention — throttle classes
are distinct from permissions and must not live in permissions.py or middleware.
"""

from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Dedicated throttle for the login endpoint only.

    5 attempts per minute per IP address.
    Rate is configurable via settings.DEFAULT_THROTTLE_RATES["login"]
    so it can be tightened in production without a code change.

    Why AnonRateThrottle base: login is AllowAny — the user is always
    unauthenticated at this point, so UserRateThrottle cannot apply.
    """

    scope = "login"
