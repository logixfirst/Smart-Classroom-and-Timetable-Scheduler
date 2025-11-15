from rest_framework import serializers
from .models import (
    User,
    Department,
    Course,
    Subject,
    Faculty,
    Student,
    Batch,
    Classroom,
    Lab,
    GenerationJob,
    Timetable,
    TimetableSlot,
    Attendance,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "department",
            "first_name",
            "last_name",
            "is_active",
        ]
        extra_kwargs = {"password": {"write_only": True}}


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"


class SubjectSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source="course", write_only=True
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )

    class Meta:
        model = Subject
        fields = "__all__"


class FacultySerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )

    # Add computed field for compatibility
    max_workload = serializers.IntegerField(
        source="max_workload_per_week", read_only=True
    )
    status = serializers.SerializerMethodField()

    def get_status(self, obj):
        return "Active"  # Default status

    class Meta:
        model = Faculty
        fields = "__all__"


class StudentSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    faculty_advisor = serializers.SerializerMethodField()

    # Write-only fields for creating/updating
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source="course", write_only=True
    )

    # Alias for consistency
    student_name = serializers.CharField(source="name", read_only=True)

    def get_faculty_advisor(self, obj):
        if obj.faculty_advisor:
            return {
                "faculty_id": obj.faculty_advisor.faculty_id,
                "faculty_name": obj.faculty_advisor.faculty_name,
            }
        return None

    class Meta:
        model = Student
        fields = "__all__"


class BatchSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(), source="course", write_only=True
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )

    class Meta:
        model = Batch
        fields = "__all__"


class ClassroomSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )

    class Meta:
        model = Classroom
        fields = "__all__"


class LabSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source="department", write_only=True
    )

    class Meta:
        model = Lab
        fields = "__all__"


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
    """Serializer for creating a timetable generation job"""

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


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    subject_name = serializers.CharField(
        source="slot.subject.subject_name", read_only=True
    )

    class Meta:
        model = Attendance
        fields = "__all__"
