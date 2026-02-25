"""
Audit Logging Middleware
ENTERPRISE PATTERN: Comprehensive audit trail for compliance

Logs all user actions:
- Who generated timetables
- Who approved/rejected timetables
- Who modified data
- When and from where (IP address)

COMPLIANCE: Required for SOC 2, ISO 27001, GDPR audit trails
"""
import json
import logging

from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

User = get_user_model()


class AuditLog(models.Model):
    """
    ENTERPRISE PATTERN: Audit log model

    Stores every user action for compliance and security auditing.
    """

    # Who
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(
        max_length=150
    )  # Preserve username even if user deleted
    organization_id = models.UUIDField(db_index=True)

    # What
    action = models.CharField(
        max_length=100, db_index=True
    )  # "timetable_generated", "timetable_approved", etc.
    resource_type = models.CharField(
        max_length=50
    )  # "TimetableWorkflow", "GenerationJob", etc.
    resource_id = models.CharField(max_length=100)

    # When
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Where
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Details
    changes = models.JSONField(default=dict, blank=True)  # Before/after values
    status = models.CharField(max_length=20, default="success")  # "success", "failure"
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "core_auditlog"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["organization_id", "-timestamp"]),
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["action", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.username} - {self.action} - {self.timestamp}"


class AuditLoggingMiddleware(MiddlewareMixin):
    """
    ENTERPRISE PATTERN: Automatic audit logging

    Logs all POST, PUT, PATCH, DELETE requests.
    GET requests only logged for sensitive resources.
    """

    # Actions to audit
    AUDITED_PATHS = {
        "/api/generate": "timetable_generation_requested",
        "/api/approve": "timetable_approved",
        "/api/reject": "timetable_rejected",
        "/api/publish": "timetable_published",
        "/api/export": "timetable_exported",
    }

    SENSITIVE_MODELS = [
        "TimetableWorkflow",
        "GenerationJob",
        "TimetableVariant",
        "ApprovalStep",
    ]

    def process_response(self, request, response):
        """Log action after request is processed."""
        # Only log authenticated requests
        if not hasattr(request, "user") or not request.user.is_authenticated:
            return response

        # Only log write operations + sensitive reads
        if request.method not in ["POST", "PUT", "PATCH", "DELETE", "GET"]:
            return response

        # Skip health checks and metrics
        if request.path in ["/health", "/metrics", "/api/config"]:
            return response

        try:
            # Determine action
            action = self._determine_action(request)
            if not action:
                return response

            # Extract details
            organization_id = getattr(request, "organization_id", None)
            if not organization_id:
                return response

            resource_type, resource_id = self._extract_resource(request, response)

            # Get IP address
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")

            # Get changes (for PUT/PATCH/DELETE)
            changes = self._extract_changes(request, response)

            # Create audit log
            AuditLog.objects.create(
                user=request.user,
                username=request.user.username,
                organization_id=organization_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                timestamp=timezone.now(),
                ip_address=ip_address,
                user_agent=user_agent,
                changes=changes,
                status="success" if 200 <= response.status_code < 300 else "failure",
                error_message=response.content.decode()
                if response.status_code >= 400
                else "",
            )

            logger.info(
                f"AUDIT: {request.user.username} - {action} - {resource_type}:{resource_id} "
                f"from {ip_address} - {response.status_code}"
            )

        except Exception as e:
            logger.error(f"Failed to create audit log: {e}", exc_info=True)

        return response

    def _determine_action(self, request) -> str:
        """Determine action from request."""
        # Check path-based actions
        for path, action in self.AUDITED_PATHS.items():
            if path in request.path:
                return action

        # Generic actions based on method
        method_actions = {
            "POST": "created",
            "PUT": "updated",
            "PATCH": "updated",
            "DELETE": "deleted",
            "GET": "accessed",
        }

        # Only audit GET for sensitive resources
        if request.method == "GET":
            if not any(
                model.lower() in request.path.lower() for model in self.SENSITIVE_MODELS
            ):
                return None

        return method_actions.get(request.method)

    def _extract_resource(self, request, response):
        """Extract resource type and ID from request/response."""
        # Try to parse from path: /api/workflows/abc-123/
        parts = [p for p in request.path.split("/") if p]

        resource_type = "unknown"
        resource_id = "unknown"

        if len(parts) >= 2:
            resource_type = parts[-2] if parts[-1] != "" else parts[-1]

        if len(parts) >= 3:
            resource_id = parts[-1] if parts[-1] != "" else parts[-2]

        # Try to get from response body (for POST)
        if request.method == "POST" and response.status_code in [200, 201]:
            try:
                data = json.loads(response.content.decode())
                if "id" in data:
                    resource_id = data["id"]
                elif "job_id" in data:
                    resource_id = data["job_id"]
                elif "workflow_id" in data:
                    resource_id = data["workflow_id"]
            except:
                pass

        return resource_type, resource_id

    def _extract_changes(self, request, response) -> dict:
        """Extract before/after changes."""
        changes = {}

        # For PUT/PATCH, try to get request body
        if request.method in ["PUT", "PATCH", "POST"]:
            try:
                if hasattr(request, "body"):
                    changes["submitted_data"] = json.loads(request.body.decode())
            except:
                pass

        return changes

    def _get_client_ip(self, request) -> str:
        """Get client IP address from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


# =============================================================================
# HELPER FUNCTIONS: Manual Audit Logging
# =============================================================================


def log_timetable_generation(
    user, organization_id: str, job_id: str, status: str = "success", error: str = ""
):
    """Log timetable generation event."""
    AuditLog.objects.create(
        user=user,
        username=user.username,
        organization_id=organization_id,
        action="timetable_generated",
        resource_type="GenerationJob",
        resource_id=job_id,
        timestamp=timezone.now(),
        status=status,
        error_message=error,
    )


def log_timetable_approval(
    user, organization_id: str, workflow_id: str, action: str, comments: str = ""
):
    """Log timetable approval/rejection."""
    AuditLog.objects.create(
        user=user,
        username=user.username,
        organization_id=organization_id,
        action=f"timetable_{action}",  # "timetable_approved" or "timetable_rejected"
        resource_type="TimetableWorkflow",
        resource_id=workflow_id,
        timestamp=timezone.now(),
        status="success",
        changes={"comments": comments},
    )


def log_timetable_export(user, organization_id: str, job_id: str, export_format: str):
    """Log timetable export."""
    AuditLog.objects.create(
        user=user,
        username=user.username,
        organization_id=organization_id,
        action="timetable_exported",
        resource_type="GenerationJob",
        resource_id=job_id,
        timestamp=timezone.now(),
        status="success",
        changes={"export_format": export_format},
    )


# =============================================================================
# SECURITY EVENT LOG  (separate from business AuditLog)
# Different consumer: SIEM / security team; different retention policy
# =============================================================================

def _get_client_ip_core(request) -> str:
    """Extract real client IP from request (X-Forwarded-For → REMOTE_ADDR)."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "")


class SecurityEvent(models.Model):
    """Immutable security event stream for auth, access, and session events."""

    EVENT_CHOICES = [
        ("login_success", "Login Success"),
        ("login_failure", "Login Failure"),
        ("login_locked", "Account Locked"),
        ("token_refresh", "Token Refreshed"),
        ("token_mismatch", "Device Fingerprint Mismatch"),
        ("token_revoked", "Session Revoked"),
        ("permission_denied", "Permission Denied"),
        ("logout", "Logout"),
        ("password_changed", "Password Changed"),
        ("password_reset", "Password Reset Requested"),
    ]

    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES, db_index=True)
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )  # null for pre-auth failures
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict)  # event-specific context
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    organization = models.ForeignKey(
        "academics.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="org_id",
    )

    class Meta:
        db_table = "security_events"
        indexes = [
            models.Index(fields=["event_type", "timestamp"], name="sec_event_type_ts_idx"),
            models.Index(fields=["user", "timestamp"], name="sec_event_user_ts_idx"),
            models.Index(fields=["organization", "timestamp"], name="sec_event_org_ts_idx"),
        ]

    def __str__(self):
        return f"{self.event_type} — {self.user} — {self.timestamp}"


def log_security_event(event_type: str, request, user=None, metadata: dict = None) -> None:
    """
    Fire-and-forget security event write.
    Swallows DB errors to never interrupt the auth flow on a logging failure.
    """
    try:
        SecurityEvent.objects.create(
            event_type=event_type,
            user=user,
            ip_address=_get_client_ip_core(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
            metadata=metadata or {},
            organization=getattr(user, "organization", None),
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("log_security_event failed: %s", exc, exc_info=True)
