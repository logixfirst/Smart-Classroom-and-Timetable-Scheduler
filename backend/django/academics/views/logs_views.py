"""
Audit Logs API - Fetch real system event logs
Lists all user actions, timetable operations, system events
"""

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.audit_logging import AuditLog

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    """
    Fetch audit logs for the organization
    GET /api/logs/audit/

    Query Parameters:
    - limit: max number of logs to return (default 100)
    - offset: pagination offset (default 0)
    - action: filter by action type
    - status: filter by status (success/failure)
    - days: filter logs from last N days (default 30)
    """
    user = request.user

    # Only admins can view logs
    if user.role not in ["super_admin", "org_admin"]:
        return Response(
            {"success": False, "error": "Only admins can view logs"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        # Get query parameters
        limit = int(request.query_params.get("limit", 100))
        offset = int(request.query_params.get("offset", 0))
        action_filter = request.query_params.get("action", "")
        status_filter = request.query_params.get("status", "")
        days = int(request.query_params.get("days", 30))

        # Limit to max 500
        limit = min(limit, 500)

        # Build query
        queryset = AuditLog.objects.filter(
            organization_id=user.organization_id,
            timestamp__gte=timezone.now() - timedelta(days=days),
        ).order_by("-timestamp")

        # Apply filters
        if action_filter:
            queryset = queryset.filter(action=action_filter)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Get total count
        total_count = queryset.count()

        # Apply pagination
        logs = queryset[offset : offset + limit]

        # Format response
        logs_data = []
        for log in logs:
            logs_data.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat(),
                "level": "INFO" if log.status == "success" else "ERROR",
                "action": log.action.replace("_", " ").title(),
                "user": log.username,
                "details": f"{log.resource_type}: {log.action}",
                "status": log.status,
                "ip_address": log.ip_address,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "error_message": log.error_message,
                "changes": log.changes,
            })

        # Get summary statistics
        total_logs = AuditLog.objects.filter(
            organization_id=user.organization_id
        ).count()
        errors = queryset.filter(status="failure").count()
        warnings = 0  # Could be implemented based on action type
        successes = queryset.filter(status="success").count()

        return Response(
            {
                "success": True,
                "data": logs_data,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "total": total_count,
                    "has_more": offset + limit < total_count,
                },
                "statistics": {
                    "total_logs": total_logs,
                    "errors": errors,
                    "warnings": warnings,
                    "successes": successes,
                },
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as e:
        return Response(
            {"success": False, "error": f"Invalid parameter: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.error("Error fetching audit logs: %s", e)
        return Response(
            {"success": False, "error": "Failed to fetch logs"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
