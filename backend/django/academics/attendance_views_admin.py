"""
Attendance Management Views Part 2: Faculty and Admin Views
"""
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .attendance_models import (
    AttendanceAlert,
    AttendanceAuditLog,
    AttendanceRecord,
    AttendanceReport,
    AttendanceSession,
)
from .attendance_serializers import (
    AttendanceAlertSerializer,
    AttendanceAuditLogSerializer,
    AttendanceOverrideSerializer,
    AttendanceReportSerializer,
    SubjectAttendanceSummarySerializer,
)
from .models import Faculty, Student, Subject


class FacultyAttendanceViewSet(viewsets.ViewSet):
    """
    Faculty Attendance Dashboard
    Faculty can view their class attendance reports
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="my-classes")
    def my_classes(self, request):
        """
        Get faculty's classes with attendance statistics
        GET /api/attendance/faculty/my-classes/
        """
        user = request.user

        if user.role != "faculty":
            return Response(
                {"error": "This endpoint is only for faculty"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            faculty = Faculty.objects.get(email=user.email)
        except Faculty.DoesNotExist:
            return Response(
                {"error": "Faculty profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Get subjects taught by this faculty
        subjects = Subject.objects.filter(faculty_assigned=faculty.faculty_id)

        summaries = []
        for subject in subjects:
            summary = self._calculate_subject_summary(subject)
            summaries.append(summary)

        serializer = SubjectAttendanceSummarySerializer(summaries, many=True)
        return Response(serializer.data)

    @action(
        detail=False, methods=["get"], url_path="class-report/(?P<subject_id>[^/.]+)"
    )
    def class_report(self, request, subject_id=None):
        """
        Get detailed report for a specific class/subject
        GET /api/attendance/faculty/class-report/{subject_id}/
        """
        user = request.user

        if user.role != "faculty":
            return Response(
                {"error": "This endpoint is only for faculty"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            faculty = Faculty.objects.get(email=user.email)
            subject = Subject.objects.get(subject_id=subject_id)

            # Verify faculty teaches this subject
            if subject.faculty_assigned != faculty.faculty_id:
                return Response(
                    {"error": "You don't teach this subject"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except (Faculty.DoesNotExist, Subject.DoesNotExist):
            return Response(
                {"error": "Faculty or Subject not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get all sessions for this subject
        sessions = AttendanceSession.objects.filter(
            subject=subject, faculty=faculty
        ).order_by("-date")

        # Get student-wise attendance
        from .models import Student

        students = Student.objects.filter(
            subject_enrollments__subject=subject, subject_enrollments__is_active=True
        ).distinct()

        student_data = []
        for student in students:
            records = AttendanceRecord.objects.filter(
                student=student, session__subject=subject
            )

            total = records.count()
            present = records.filter(Q(status="present") | Q(status="late")).count()
            percentage = (present / total * 100) if total > 0 else 0

            student_data.append(
                {
                    "student_id": student.student_id,
                    "student_name": student.name,
                    "total_classes": total,
                    "attended": present,
                    "percentage": round(percentage, 2),
                    "status": "at_risk" if percentage < 75 else "good",
                }
            )

        # Sort by percentage (lowest first to identify at-risk students)
        student_data.sort(key=lambda x: x["percentage"])

        return Response(
            {
                "subject": {"id": subject.subject_id, "name": subject.subject_name},
                "total_sessions": sessions.count(),
                "students": student_data,
                "at_risk_count": sum(1 for s in student_data if s["percentage"] < 75),
            }
        )

    def _calculate_subject_summary(self, subject):
        """Calculate summary statistics for a subject"""
        sessions = AttendanceSession.objects.filter(subject=subject)
        total_sessions = sessions.count()
        marked_sessions = sessions.filter(is_marked=True).count()

        # Calculate average attendance
        if marked_sessions > 0:
            records = AttendanceRecord.objects.filter(session__subject=subject)
            total_records = records.count()
            present_records = records.filter(
                Q(status="present") | Q(status="late")
            ).count()
            avg_attendance = (
                (present_records / total_records * 100) if total_records > 0 else 0
            )
        else:
            avg_attendance = 0

        # Count students
        from .attendance_models import SubjectEnrollment

        student_count = SubjectEnrollment.objects.filter(
            subject=subject, is_active=True
        ).count()

        # Count at-risk students
        students = Student.objects.filter(
            subject_enrollments__subject=subject, subject_enrollments__is_active=True
        ).distinct()

        at_risk_count = 0
        for student in students:
            records = AttendanceRecord.objects.filter(
                student=student, session__subject=subject
            )
            total = records.count()
            if total > 0:
                present = records.filter(Q(status="present") | Q(status="late")).count()
                percentage = present / total * 100
                if percentage < 75:
                    at_risk_count += 1

        return {
            "subject_id": subject.subject_id,
            "subject_name": subject.subject_name,
            "total_sessions": total_sessions,
            "sessions_marked": marked_sessions,
            "average_attendance": round(avg_attendance, 2),
            "student_count": student_count,
            "at_risk_students": at_risk_count,
        }


class AdminAttendanceViewSet(viewsets.ViewSet):
    """
    Admin Attendance Dashboard
    Full access to all attendance data
    """

    permission_classes = [IsAuthenticated]

    def _check_admin_permission(self, user):
        """Check if user has admin or staff role"""
        role_lower = user.role.lower()
        if role_lower not in ["admin", "staff", "org_admin"]:
            return False
        return True

    @action(detail=False, methods=["get"], url_path="overview")
    def overview(self, request):
        """
        Get overall attendance overview
        GET /api/attendance/admin/overview/
        """
        if not self._check_admin_permission(request.user):
            return Response(
                {"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN
            )

        # Overall statistics
        total_sessions = AttendanceSession.objects.count()
        marked_sessions = AttendanceSession.objects.filter(is_marked=True).count()
        pending_sessions = total_sessions - marked_sessions

        total_records = AttendanceRecord.objects.count()
        present_records = AttendanceRecord.objects.filter(
            Q(status="present") | Q(status="late")
        ).count()
        overall_attendance = (
            (present_records / total_records * 100) if total_records > 0 else 0
        )

        # Department-wise statistics (optimized with aggregation)
        from django.db.models import Count, Case, When, IntegerField
        from .models import Department

        departments = Department.objects.all()[:10]  # Limit to 10 departments for performance
        dept_stats = []

        for dept in departments:
            dept_sessions = AttendanceSession.objects.filter(subject__department=dept)
            dept_total_sessions = dept_sessions.count()
            dept_marked = dept_sessions.filter(is_marked=True).count()

            dept_records = AttendanceRecord.objects.filter(
                session__subject__department=dept
            )
            dept_total_records = dept_records.count()
            dept_present = dept_records.filter(
                Q(status="present") | Q(status="late")
            ).count()
            dept_percentage = (
                (dept_present / dept_total_records * 100)
                if dept_total_records > 0
                else 0
            )

            dept_stats.append(
                {
                    "department_name": dept.dept_name,
                    "total_sessions": dept_total_sessions,
                    "sessions_marked": dept_marked,
                    "average_attendance": round(dept_percentage, 2),
                    "at_risk_students": 0,  # Disabled for performance
                }
            )

        # At-risk students count (use alerts instead of calculating)
        total_at_risk = AttendanceAlert.objects.filter(
            alert_type="low_attendance",
            is_read=False
        ).values('student').distinct().count()

        return Response(
            {
                "total_sessions": total_sessions,
                "sessions_marked": marked_sessions,
                "sessions_pending": pending_sessions,
                "overall_attendance_percentage": round(overall_attendance, 2),
                "at_risk_students_count": total_at_risk,
                "department_stats": dept_stats,
            }
        )

    @action(detail=False, methods=["post"], url_path="override")
    def override_attendance(self, request):
        """
        Admin override for attendance records
        POST /api/attendance/admin/override/
        Body: {"record_id": 123, "new_status": "present", "reason": "..."}
        """
        if not self._check_admin_permission(request.user):
            return Response(
                {"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = AttendanceOverrideSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        record = AttendanceRecord.objects.get(
            record_id=serializer.validated_data["record_id"]
        )
        old_status = record.status
        new_status = serializer.validated_data["new_status"]
        reason = serializer.validated_data["reason"]

        # Update record
        record.status = new_status
        record.save()

        # Create audit log
        from .attendance_views import get_client_ip

        AttendanceAuditLog.objects.create(
            record=record,
            action="override",
            old_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            reason=reason,
            ip_address=get_client_ip(request),
        )

        return Response(
            {
                "message": "Attendance record overridden successfully",
                "record_id": record.record_id,
                "old_status": old_status,
                "new_status": new_status,
            }
        )

    @action(detail=False, methods=["get"], url_path="audit-logs")
    def audit_logs(self, request):
        """
        Get attendance audit logs
        GET /api/attendance/admin/audit-logs/
        """
        if not self._check_admin_permission(request.user):
            return Response(
                {"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN
            )

        # Filters
        record_id = request.query_params.get("record_id")
        action = request.query_params.get("action")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        logs = (
            AttendanceAuditLog.objects.all()
            .select_related("record", "changed_by")
            .order_by("-changed_at")
        )

        if record_id:
            logs = logs.filter(record_id=record_id)
        if action:
            logs = logs.filter(action=action)
        if start_date:
            logs = logs.filter(changed_at__gte=start_date)
        if end_date:
            logs = logs.filter(changed_at__lte=end_date)

        # Pagination
        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        paginator.page_size = 50
        result_page = paginator.paginate_queryset(logs, request)

        serializer = AttendanceAuditLogSerializer(result_page, many=True)
        response_data = serializer.data
        # Add id field for frontend compatibility
        for i, item in enumerate(response_data):
            item['id'] = result_page[i].audit_id
        return paginator.get_paginated_response(response_data)

    @action(detail=False, methods=["get"], url_path="generate-report")
    def generate_report(self, request):
        """
        Generate attendance report
        GET /api/attendance/admin/generate-report/?type=daily&start_date=...&end_date=...
        """
        if not self._check_admin_permission(request.user):
            return Response(
                {"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN
            )

        report_type = request.query_params.get("type", "daily")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        department_id = request.query_params.get("department")
        course_id = request.query_params.get("course")
        subject_id = request.query_params.get("subject")

        if not start_date or not end_date:
            return Response(
                {"error": "start_date and end_date are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build query
        sessions = AttendanceSession.objects.filter(
            date__gte=start_date, date__lte=end_date, is_marked=True
        )

        if department_id:
            sessions = sessions.filter(subject__department_id=department_id)
        if course_id:
            sessions = sessions.filter(subject__course_id=course_id)
        if subject_id:
            sessions = sessions.filter(subject_id=subject_id)

        # Generate report data
        report_data = {
            "sessions": [],
            "summary": {
                "total_sessions": sessions.count(),
                "total_students": 0,
                "average_attendance": 0,
            },
        }

        total_present = 0
        total_records = 0

        for session in sessions:
            records = AttendanceRecord.objects.filter(session=session)
            present_count = records.filter(
                Q(status="present") | Q(status="late")
            ).count()
            total_count = records.count()

            report_data["sessions"].append(
                {
                    "date": str(session.date),
                    "subject": session.subject.subject_name,
                    "faculty": session.faculty.faculty_name,
                    "total_students": total_count,
                    "present": present_count,
                    "percentage": round((present_count / total_count * 100), 2)
                    if total_count > 0
                    else 0,
                }
            )

            total_present += present_count
            total_records += total_count

        report_data["summary"]["average_attendance"] = (
            round((total_present / total_records * 100), 2) if total_records > 0 else 0
        )

        # Save report

        report = AttendanceReport.objects.create(
            report_type=report_type,
            title=f"{report_type.capitalize()} Attendance Report - {start_date} to {end_date}",
            generated_by=request.user,
            department_id=department_id if department_id else None,
            course_id=course_id if course_id else None,
            subject_id=subject_id if subject_id else None,
            start_date=start_date,
            end_date=end_date,
            data=report_data,
        )

        serializer = AttendanceReportSerializer(report)
        return Response(serializer.data)


class AttendanceAlertViewSet(viewsets.ModelViewSet):
    """
    Attendance Alerts Management
    """

    serializer_class = AttendanceAlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role in ["admin", "staff"]:
            return (
                AttendanceAlert.objects.all()
                .select_related("student", "faculty", "subject")
                .order_by("-created_at")
            )

        elif user.role == "faculty":
            faculty = Faculty.objects.get(email=user.email)
            return (
                AttendanceAlert.objects.filter(faculty=faculty)
                .select_related("student", "subject")
                .order_by("-created_at")
            )

        elif user.role == "student":
            student = Student.objects.get(email=user.email)
            return (
                AttendanceAlert.objects.filter(student=student)
                .select_related("subject")
                .order_by("-created_at")
            )

        return AttendanceAlert.objects.none()

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        """
        Acknowledge an alert
        POST /api/attendance/alerts/{id}/acknowledge/
        """
        alert = self.get_object()
        alert.is_read = True
        alert.acknowledged_at = timezone.now()
        alert.save()

        return Response({"message": "Alert acknowledged", "alert_id": alert.alert_id})

    @action(detail=False, methods=["get"], url_path="unread")
    def unread(self, request):
        """
        Get unread alerts
        GET /api/attendance/alerts/unread/
        """
        alerts = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
