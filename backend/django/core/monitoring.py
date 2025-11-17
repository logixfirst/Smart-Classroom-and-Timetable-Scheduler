"""
Error Tracking and Monitoring Utilities
"""
import logging
import time
from functools import wraps

import sentry_sdk
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


def track_errors(func):
    """
    Decorator to track errors in functions
    Sends errors to Sentry and logs them
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            # Log error
            logger.error(
                f"Error in {func.__name__}: {str(e)}",
                exc_info=True,
                extra={"function": func.__name__, "args": args, "kwargs": kwargs},
            )

            # Send to Sentry
            if hasattr(settings, "SENTRY_DSN") and settings.SENTRY_DSN:
                sentry_sdk.capture_exception(e)

            # Re-raise exception
            raise

    return wrapper


def log_performance(func):
    """
    Decorator to log function performance
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        import time

        start_time = time.time()

        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time

            logger.info(
                f"{func.__name__} executed in {execution_time:.2f}s",
                extra={
                    "function": func.__name__,
                    "execution_time": execution_time,
                    "success": True,
                },
            )

            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"{func.__name__} failed after {execution_time:.2f}s",
                exc_info=True,
                extra={
                    "function": func.__name__,
                    "execution_time": execution_time,
                    "success": False,
                    "error": str(e),
                },
            )
            raise

    return wrapper


class ErrorMonitor:
    """
    Monitor and track application errors
    """

    @staticmethod
    def record_error(error_type, message, context=None):
        """
        Record error in cache for monitoring
        """
        try:
            error_key = f"errors:{error_type}:count"
            current_count = cache.get(error_key, 0)
            cache.set(error_key, current_count + 1, timeout=3600)  # 1 hour

            # Store recent errors
            recent_errors_key = f"errors:recent:{error_type}"
            recent_errors = cache.get(recent_errors_key, [])
            recent_errors.append(
                {"message": message, "context": context, "timestamp": time.time()}
            )

            # Keep only last 100 errors
            recent_errors = recent_errors[-100:]
            cache.set(recent_errors_key, recent_errors, timeout=3600)

            logger.error(
                f"Error recorded: {error_type} - {message}",
                extra={"error_type": error_type, "context": context},
            )
        except Exception as e:
            logger.error(f"Failed to record error: {str(e)}")

    @staticmethod
    def get_error_stats():
        """
        Get error statistics
        """
        error_types = ["database", "cache", "api", "validation"]
        stats = {}

        for error_type in error_types:
            error_key = f"errors:{error_type}:count"
            count = cache.get(error_key, 0)
            stats[error_type] = count

        return stats

    @staticmethod
    def clear_error_stats():
        """
        Clear error statistics
        """
        error_types = ["database", "cache", "api", "validation"]
        for error_type in error_types:
            cache.delete(f"errors:{error_type}:count")
            cache.delete(f"errors:recent:{error_type}")


def setup_error_monitoring():
    """
    Initialize error monitoring (call in settings or app config)
    """
    if hasattr(settings, "SENTRY_DSN") and settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,  # 10% of transactions
            profiles_sample_rate=0.1,  # 10% of transactions for profiling
            environment=settings.ENV if hasattr(settings, "ENV") else "production",
            send_default_pii=False,  # Don't send PII
            before_send=filter_sensitive_data,
        )
        logger.info("Sentry error monitoring initialized")


def filter_sensitive_data(event, hint):
    """
    Filter sensitive data before sending to Sentry
    """
    # Remove sensitive keys
    sensitive_keys = ["password", "token", "api_key", "secret"]

    if "request" in event:
        if "data" in event["request"]:
            for key in sensitive_keys:
                if key in event["request"]["data"]:
                    event["request"]["data"][key] = "[FILTERED]"

    return event


# Usage example in views or services
class MonitoredViewMixin:
    """
    Mixin to add error monitoring to views
    """

    @track_errors
    @log_performance
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
