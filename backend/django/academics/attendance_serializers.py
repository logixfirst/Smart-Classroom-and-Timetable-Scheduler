"""
Attendance Management Serializers with RBAC
"""
from rest_framework import serializers
from .attendance_models import (
    SubjectEnrollment,
    AttendanceSession,
    AttendanceRecord,
    AttendanceAuditLog,
    AttendanceAlert,
    AttendanceReport,
    AttendanceThreshold
)
from .models import Student, Faculty, Subject, Batch
from django.utils import timezone
from django.db.models import Count, Q, Avg
from datetime import datetime, timedelta


class SubjectEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id_display = serializers.CharField(source='student.student_id', read_only=True)
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    subject_code = serializers.CharField(source='subject.subject_id', read_only=True)
    
    class Meta:
        model = SubjectEnrollment
        fields = '__all__'


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id_display = serializers.CharField(source='student.student_id', read_only=True)
    marked_by_name = serializers.CharField(source='marked_by.faculty_name', read_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = '__all__'


class AttendanceSessionDetailSerializer(serializers.ModelSerializer):
    """Detailed session with all attendance records"""
    attendance_records = AttendanceRecordSerializer(many=True, read_only=True)
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    faculty_name = serializers.CharField(source='faculty.faculty_name', read_only=True)
    batch_name = serializers.CharField(source='batch.batch_id', read_only=True)
    
    # Statistics
    total_students = serializers.SerializerMethodField()
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    late_count = serializers.SerializerMethodField()
    excused_count = serializers.SerializerMethodField()
    attendance_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceSession
        fields = '__all__'
    
    def get_total_students(self, obj):
        return obj.attendance_records.count()
    
    def get_present_count(self, obj):
        return obj.attendance_records.filter(status='present').count()
    
    def get_absent_count(self, obj):
        return obj.attendance_records.filter(status='absent').count()
    
    def get_late_count(self, obj):
        return obj.attendance_records.filter(status='late').count()
    
    def get_excused_count(self, obj):
        return obj.attendance_records.filter(status='excused').count()
    
    def get_attendance_percentage(self, obj):
        total = obj.attendance_records.count()
        if total == 0:
            return 0
        present = obj.attendance_records.filter(
            Q(status='present') | Q(status='late')
        ).count()
        return round((present / total) * 100, 2)


class AttendanceSessionSerializer(serializers.ModelSerializer):
    """Basic session info without records"""
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    faculty_name = serializers.CharField(source='faculty.faculty_name', read_only=True)
    batch_name = serializers.CharField(source='batch.batch_id', read_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = '__all__'


class BulkAttendanceMarkSerializer(serializers.Serializer):
    """For marking attendance for multiple students at once"""
    session_id = serializers.IntegerField()
    attendance_data = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )
    # attendance_data format:
    # [
    #   {"student_id": "S001", "status": "present"},
    #   {"student_id": "S002", "status": "absent", "remarks": "Sick leave"},
    # ]
    
    def validate_session_id(self, value):
        if not AttendanceSession.objects.filter(session_id=value).exists():
            raise serializers.ValidationError("Session not found")
        return value
    
    def validate_attendance_data(self, value):
        if not value:
            raise serializers.ValidationError("Attendance data cannot be empty")
        
        for record in value:
            if 'student_id' not in record or 'status' not in record:
                raise serializers.ValidationError(
                    "Each record must have student_id and status"
                )
            
            if record['status'] not in ['present', 'absent', 'late', 'excused']:
                raise serializers.ValidationError(
                    f"Invalid status: {record['status']}"
                )
        
        return value


class StudentAttendanceSummarySerializer(serializers.Serializer):
    """Summary of student's attendance across all subjects"""
    student_id = serializers.CharField()
    student_name = serializers.CharField()
    subject_wise_attendance = serializers.ListField()
    overall_percentage = serializers.FloatField()
    total_classes = serializers.IntegerField()
    classes_attended = serializers.IntegerField()
    classes_missed = serializers.IntegerField()
    late_count = serializers.IntegerField()
    excused_count = serializers.IntegerField()
    at_risk = serializers.BooleanField()


class SubjectAttendanceSummarySerializer(serializers.Serializer):
    """Summary of attendance for a subject"""
    subject_id = serializers.CharField()
    subject_name = serializers.CharField()
    total_sessions = serializers.IntegerField()
    sessions_marked = serializers.IntegerField()
    average_attendance = serializers.FloatField()
    student_count = serializers.IntegerField()
    at_risk_students = serializers.IntegerField()


class AttendanceAuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='record.student.name', read_only=True)
    session_details = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceAuditLog
        fields = '__all__'
    
    def get_changed_by_name(self, obj):
        if obj.changed_by:
            if hasattr(obj.changed_by, 'faculty'):
                return obj.changed_by.faculty.faculty_name
            return obj.changed_by.username
        return "System"
    
    def get_session_details(self, obj):
        session = obj.record.session
        return {
            'subject': session.subject.subject_name,
            'date': session.date,
            'time': f"{session.start_time} - {session.end_time}"
        }


class AttendanceAlertSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    faculty_name = serializers.CharField(source='faculty.faculty_name', read_only=True)
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    
    class Meta:
        model = AttendanceAlert
        fields = '__all__'


class AttendanceReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source='generated_by.username', read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    
    class Meta:
        model = AttendanceReport
        fields = '__all__'


class AttendanceThresholdSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    
    class Meta:
        model = AttendanceThreshold
        fields = '__all__'


class AttendanceOverrideSerializer(serializers.Serializer):
    """For admin to override attendance records"""
    record_id = serializers.IntegerField()
    new_status = serializers.ChoiceField(
        choices=['present', 'absent', 'late', 'excused']
    )
    reason = serializers.CharField()
    
    def validate_record_id(self, value):
        if not AttendanceRecord.objects.filter(record_id=value).exists():
            raise serializers.ValidationError("Attendance record not found")
        return value


class AttendanceImportSerializer(serializers.Serializer):
    """For bulk import via CSV/Excel"""
    file = serializers.FileField()
    session_id = serializers.IntegerField()
    
    def validate_file(self, value):
        if not value.name.endswith(('.csv', '.xlsx', '.xls')):
            raise serializers.ValidationError(
                "Only CSV and Excel files are supported"
            )
        return value
