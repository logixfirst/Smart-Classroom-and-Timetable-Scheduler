"""
Request/Response Logging Middleware for Django
Logs all API requests and responses for debugging and monitoring
"""
import json
import time
import logging
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.http import JsonResponse
from io import StringIO


# Configure logger
logger = logging.getLogger("api_requests")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class RequestResponseLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log API requests and responses
    """

    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def process_request(self, request):
        """Log incoming request details"""
        request.start_time = time.time()

        # Only log API requests
        if not request.path.startswith("/api/"):
            return None

        # Parse request body for POST/PUT requests
        request_body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                if hasattr(request, "body") and request.body:
                    if request.content_type == "application/json":
                        request_body = json.loads(request.body.decode("utf-8"))
                    else:
                        request_body = request.body.decode("utf-8")[
                            :500
                        ]  # Limit body size
            except (json.JSONDecodeError, UnicodeDecodeError):
                request_body = "<Unable to parse request body>"

        # Log request details
        log_data = {
            "type": "REQUEST",
            "method": request.method,
            "path": request.path,
            "query_params": dict(request.GET),
            "user": str(request.user)
            if hasattr(request, "user") and request.user.is_authenticated
            else "Anonymous",
            "ip_address": self.get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            "content_type": request.content_type,
        }

        if request_body:
            # Mask sensitive fields
            if isinstance(request_body, dict):
                masked_body = self.mask_sensitive_data(request_body)
                log_data["request_body"] = masked_body
            else:
                log_data["request_body"] = request_body

        logger.info(f"API Request: {json.dumps(log_data, indent=2)}")
        return None

    def process_response(self, request, response):
        """Log response details"""

        # Only log API requests
        if not request.path.startswith("/api/"):
            return response

        # Calculate response time
        response_time = None
        if hasattr(request, "start_time"):
            response_time = round((time.time() - request.start_time) * 1000, 2)  # ms

        # Parse response content
        response_content = None
        if isinstance(response, JsonResponse):
            try:
                response_content = json.loads(response.content.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                response_content = "<Unable to parse response>"
        elif hasattr(response, "content"):
            content_str = response.content.decode("utf-8")
            if len(content_str) > 1000:  # Limit response content size
                response_content = content_str[:1000] + "... [truncated]"
            else:
                response_content = content_str

        # Log response details
        log_data = {
            "type": "RESPONSE",
            "method": request.method,
            "path": request.path,
            "status_code": response.status_code,
            "response_time_ms": response_time,
            "content_type": response.get("Content-Type", ""),
            "content_length": len(response.content)
            if hasattr(response, "content")
            else 0,
        }

        if response_content:
            # Mask sensitive data in response
            if isinstance(response_content, dict):
                masked_content = self.mask_sensitive_data(response_content)
                log_data["response_content"] = masked_content
            else:
                log_data["response_content"] = response_content

        # Log level based on status code
        if response.status_code >= 500:
            logger.error(f"API Response (Error): {json.dumps(log_data, indent=2)}")
        elif response.status_code >= 400:
            logger.warning(
                f"API Response (Client Error): {json.dumps(log_data, indent=2)}"
            )
        else:
            logger.info(f"API Response (Success): {json.dumps(log_data, indent=2)}")

        return response

    def process_exception(self, request, exception):
        """Log exceptions"""

        # Only log API request exceptions
        if not request.path.startswith("/api/"):
            return None

        log_data = {
            "type": "EXCEPTION",
            "method": request.method,
            "path": request.path,
            "exception_type": type(exception).__name__,
            "exception_message": str(exception),
            "user": str(request.user)
            if hasattr(request, "user") and request.user.is_authenticated
            else "Anonymous",
        }

        logger.error(f"API Exception: {json.dumps(log_data, indent=2)}")
        return None

    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def mask_sensitive_data(self, data):
        """Mask sensitive fields in data"""
        if not isinstance(data, dict):
            return data

        sensitive_fields = [
            "password",
            "token",
            "secret",
            "key",
            "auth",
            "authorization",
            "csrf_token",
            "api_key",
            "access_token",
            "refresh_token",
        ]

        masked_data = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                masked_data[key] = "***MASKED***"
            elif isinstance(value, dict):
                masked_data[key] = self.mask_sensitive_data(value)
            elif isinstance(value, list):
                masked_data[key] = [
                    self.mask_sensitive_data(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                masked_data[key] = value

        return masked_data


class APIMetricsMiddleware(MiddlewareMixin):
    """
    Middleware to track API metrics (response times, status codes, etc.)
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.metrics_logger = logging.getLogger("api_metrics")
        super().__init__(get_response)

    def process_request(self, request):
        request.start_time = time.time()
        return None

    def process_response(self, request, response):
        # Only track API endpoints
        if not request.path.startswith("/api/"):
            return response

        if hasattr(request, "start_time"):
            response_time = (time.time() - request.start_time) * 1000  # ms

            # Log metrics
            metrics = {
                "endpoint": request.path,
                "method": request.method,
                "status_code": response.status_code,
                "response_time_ms": round(response_time, 2),
                "timestamp": time.time(),
                "user": str(request.user)
                if hasattr(request, "user") and request.user.is_authenticated
                else "anonymous",
            }

            self.metrics_logger.info(json.dumps(metrics))

        return response
