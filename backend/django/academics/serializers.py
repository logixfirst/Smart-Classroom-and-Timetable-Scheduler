from rest_framework import serializers

from .models import Program  # Changed from Course
from .models import (  # Lab removed - not in multi-tenant models
    Attendance,
    Batch,
    Classroom,
    Department,
    Faculty,
    GenerationJob,
    Student,
    Subject,
    Timetable,
    TimetableSlot,
    User,
)


class UserSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(
        source="organization.org_name", read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "organization",
            "organization_name",
            "first_name",
            "last_name",
            "is_active",
        ]
        extra_kwargs = {"password": {"write_only": True}}


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program model (formerly Course)"""

    class Meta:
        model = Program
        fields = "__all__"


# Alias for backwards compatibility
CourseSerializer = ProgramSerializer


class SubjectSerializer(serializers.ModelSerializer):
    program = ProgramSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    program_id = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.all(),
        source="program",
        write_only=True,
        required=False,
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        required=False,
    )

    # Backwards compatibility
    course = serializers.SerializerMethodField()

    def get_course(self, obj):
        if hasattr(obj, "program") and obj.program:
            return ProgramSerializer(obj.program).data
        return None

    class Meta:
        model = Subject
        fields = "__all__"


class FacultySerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )

    # Add computed field for compatibility
    max_workload = serializers.IntegerField(
        source="max_workload_per_week", read_only=True
    )
    status = serializers.SerializerMethodField()

    def get_department(self, obj):
        if obj.department:
            return {
                "dept_id": str(obj.department.dept_id),
                "dept_code": obj.department.dept_code,
                "dept_name": obj.department.dept_name,
                "hod_name": obj.department.hod_name,
                "hod_email": obj.department.hod_email,
                "building_name": obj.department.building_name,
                "floor_numbers": obj.department.floor_numbers,
                "is_active": obj.department.is_active,
                "created_at": obj.department.created_at,
                "updated_at": obj.department.updated_at,
                "organization": str(obj.department.organization_id),
                "school": str(obj.department.school_id)
                if obj.department.school_id
                else None,
            }
        return None

    def get_status(self, obj):
        return "Active"  # Default status

    class Meta:
        model = Faculty
        fields = "__all__"


class StudentSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    program = serializers.SerializerMethodField()
    faculty_advisor = serializers.SerializerMethodField()

    # Write-only fields for creating/updating
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        required=False,
    )
    program_id = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.all(),
        source="program",
        write_only=True,
        required=False,
    )

    # Backwards compatibility - map old field names to new
    student_id = serializers.CharField(source="roll_number", required=False)
    name = serializers.CharField(source="student_name", required=False)
    year = serializers.IntegerField(source="current_year", required=False)
    semester = serializers.IntegerField(source="current_semester", required=False)

    # Alias course to program for backwards compatibility
    course = serializers.SerializerMethodField()

    def get_department(self, obj):
        if obj.department:
            return {
                "dept_id": str(obj.department.dept_id),
                "dept_code": obj.department.dept_code,
                "dept_name": obj.department.dept_name,
                "hod_name": obj.department.hod_name,
                "hod_email": obj.department.hod_email,
                "building_name": obj.department.building_name,
                "floor_numbers": obj.department.floor_numbers,
                "is_active": obj.department.is_active,
                "created_at": obj.department.created_at,
                "updated_at": obj.department.updated_at,
                "organization": str(obj.department.organization_id),
                "school": str(obj.department.school_id)
                if obj.department.school_id
                else None,
            }
        return None

    def get_program(self, obj):
        if obj.program:
            return {
                "program_id": str(obj.program.program_id),
                "program_code": obj.program.program_code,
                "program_name": obj.program.program_name,
                "program_type": obj.program.program_type,
                "duration_years": obj.program.duration_years,
                "total_semesters": obj.program.total_semesters,
                "total_credits": obj.program.total_credits,
                "allow_multiple_entry_exit": obj.program.allow_multiple_entry_exit,
                "exit_certificate_1_year": obj.program.exit_certificate_1_year,
                "exit_diploma_2_years": obj.program.exit_diploma_2_years,
                "exit_degree_3_years": obj.program.exit_degree_3_years,
                "intake_capacity": obj.program.intake_capacity,
                "min_eligibility": obj.program.min_eligibility,
                "is_active": obj.program.is_active,
                "created_at": obj.program.created_at,
                "updated_at": obj.program.updated_at,
                "department": str(obj.program.department_id)
                if obj.program.department_id
                else None,
                "organization": str(obj.program.organization_id),
            }
        return None

    def get_course(self, obj):
        # Alias for backwards compatibility
        return self.get_program(obj)

    def get_faculty_advisor(self, obj):
        if obj.faculty_advisor:
            return {
                "faculty_id": str(obj.faculty_advisor.faculty_id),
                "faculty_name": obj.faculty_advisor.faculty_name,
            }
        return None

    class Meta:
        model = Student
        fields = "__all__"


class BatchSerializer(serializers.ModelSerializer):
    program = ProgramSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    program_id = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.all(),
        source="program",
        write_only=True,
        required=False,
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        required=False,
    )

    # Backwards compatibility
    course = serializers.SerializerMethodField()
    year = serializers.IntegerField(source="year_of_admission", required=False)
    semester = serializers.IntegerField(source="current_semester", required=False)

    def get_course(self, obj):
        if hasattr(obj, "program") and obj.program:
            return ProgramSerializer(obj.program).data
        return None

    class Meta:
        model = Batch
        fields = "__all__"


class ClassroomSerializer(serializers.ModelSerializer):
    # Multi-tenant Classroom model doesn't have department FK
    # It has organization FK instead
    class Meta:
        model = Classroom
        fields = "__all__"


# Lab model removed in multi-tenant architecture
# Labs are now handled as Classroom with room_type='lab'


class TimetableSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.subject_name", read_only=True)
    faculty_name = serializers.CharField(source="faculty.faculty_name", read_only=True)
    classroom_number = serializers.CharField(
        source="classroom.room_number", read_only=True
    )

    class Meta:
        model = TimetableSlot
        fields = "__all__"


class TimetableSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.department_name", read_only=True
    )
    batch_name = serializers.CharField(source="batch.batch_id", read_only=True)
    slots = TimetableSlotSerializer(many=True, read_only=True)

    class Meta:
        model = Timetable
        fields = "__all__"


class GenerationJobSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.department_name", read_only=True
    )
    batch_name = serializers.CharField(source="batch.batch_id", read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )

    class Meta:
        model = GenerationJob
        fields = "__all__"
        read_only_fields = [
            "job_id",
            "status",
            "progress",
            "created_at",
            "updated_at",
            "completed_at",
        ]


class GenerationJobCreateSerializer(serializers.Serializer):
    """Serializer for creating a timetable generation job (legacy)"""

    department_id = serializers.CharField(required=True)
    batch_id = serializers.CharField(required=True)
    semester = serializers.IntegerField(required=True, min_value=1, max_value=8)
    academic_year = serializers.CharField(required=True)

    def validate_department_id(self, value):
        if not Department.objects.filter(department_id=value).exists():
            raise serializers.ValidationError("Department does not exist")
        return value

    def validate_batch_id(self, value):
        if not Batch.objects.filter(batch_id=value).exists():
            raise serializers.ValidationError("Batch does not exist")
        return value


class UniversityTimetableGenerationSerializer(serializers.Serializer):
    """Simplified serializer for university-wide timetable generation"""

    academic_year = serializers.CharField(required=True)
    semester = serializers.ChoiceField(choices=["odd", "even"], required=True)
    university_id = serializers.IntegerField(required=False)

    def validate_academic_year(self, value):
        # Validate format: YYYY-YYYY
        if not value or len(value.split("-")) != 2:
            raise serializers.ValidationError(
                "Academic year must be in format YYYY-YYYY (e.g., 2024-2025)"
            )
        return value


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    subject_name = serializers.CharField(
        source="slot.subject.subject_name", read_only=True
    )

    class Meta:
        model = Attendance
        fields = "__all__"
