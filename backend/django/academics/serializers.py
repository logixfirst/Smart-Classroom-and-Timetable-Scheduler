from rest_framework import serializers

from .models import (
    Attendance,
    Batch,
    Building,
    Course,
    Department,
    Faculty,
    GenerationJob,
    Program,
    Room,
    School,
    Student,
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


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model (courses table)"""
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source="department",
        write_only=True,
        required=False,
    )

    class Meta:
        model = Course
        fields = "__all__"

# Alias for backward compatibility
SubjectSerializer = CourseSerializer


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
            }
        return None

    def get_status(self, obj):
        return "Active"  # Default status

    class Meta:
        model = Faculty
        fields = "__all__"


class StudentSerializer(serializers.ModelSerializer):
    department = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()  # Alias for program
    faculty_advisor = serializers.SerializerMethodField()

    # Backwards compatibility - map old field names to new
    id = serializers.UUIDField(source="student_id", read_only=True)
    student_id = serializers.CharField(source="roll_number", required=False)
    name = serializers.SerializerMethodField()
    year = serializers.IntegerField(source="current_year", required=False)
    semester = serializers.IntegerField(source="current_semester", required=False)
    electives = serializers.CharField(default="", required=False)
    phone = serializers.CharField(source="phone_number", required=False)
    
    def get_name(self, obj):
        """Get full name from first_name and last_name"""
        try:
            parts = []
            if obj.first_name:
                parts.append(obj.first_name)
            if obj.middle_name:
                parts.append(obj.middle_name)
            if obj.last_name:
                parts.append(obj.last_name)
            return " ".join(parts) if parts else "Unknown"
        except Exception:
            return "Unknown"

    def get_department(self, obj):
        try:
            if obj.department:
                return {
                    "department_id": str(obj.department.dept_id),
                    "department_name": obj.department.dept_name,
                }
        except Exception:
            pass
        return {
            "department_id": "unknown",
            "department_name": "Unknown Department",
        }

    def get_course(self, obj):
        try:
            if obj.program:
                return {
                    "course_id": str(obj.program.program_id),
                    "course_name": obj.program.program_name,
                }
        except Exception:
            pass
        return {
            "course_id": "unknown",
            "course_name": "Unknown Program",
        }

    def get_faculty_advisor(self, obj):
        # Faculty advisor field doesn't exist in current schema
        return {
            "faculty_id": "unknown",
            "faculty_name": "Not assigned",
        }

    class Meta:
        model = Student
        fields = [
            "id", "student_id", "name", "email", "phone", 
            "department", "course", "electives", "year", "semester", 
            "faculty_advisor", "is_active", "created_at", "updated_at"
        ]


class BatchSerializer(serializers.ModelSerializer):
    """Serializer for Batch model"""
    program = ProgramSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    
    class Meta:
        model = Batch
        fields = "__all__"


class BuildingSerializer(serializers.ModelSerializer):
    """Serializer for Building model"""
    
    class Meta:
        model = Building
        fields = "__all__"


class SchoolSerializer(serializers.ModelSerializer):
    """Serializer for School model"""
    
    class Meta:
        model = School
        fields = "__all__"


class RoomSerializer(serializers.ModelSerializer):
    """Serializer for Room model (rooms table)"""
    building_name = serializers.CharField(source="building.building_name", read_only=True, allow_null=True)
    department_name = serializers.CharField(source="department.dept_name", read_only=True, allow_null=True)
    
    class Meta:
        model = Room
        fields = [
            "room_id", "room_code", "room_number", "room_name", "room_type",
            "seating_capacity", "exam_capacity", "floor_number",
            "building", "building_name", "department", "department_name",
            "is_active", "room_status", "created_at", "updated_at"
        ]

# Alias for backward compatibility
ClassroomSerializer = RoomSerializer


class TimetableSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.course_name", read_only=True)
    faculty_name = serializers.CharField(source="faculty.faculty_name", read_only=True)
    classroom_number = serializers.CharField(source="classroom.room_number", read_only=True)

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

    # Batch validation removed - batches don't exist


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