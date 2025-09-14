from rest_framework import serializers

class ClassroomSerializer(serializers.Serializer):
    id = serializers.CharField()
    roomNumber = serializers.CharField()
    capacity = serializers.IntegerField()
    type = serializers.ChoiceField(choices=['lecture', 'lab'])

class BatchSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    strength = serializers.IntegerField()

class SubjectSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    code = serializers.CharField()
    classesPerWeek = serializers.IntegerField()

class FacultySerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()

class FixedSlotSerializer(serializers.Serializer):
    id = serializers.CharField()
    subject = serializers.CharField()
    faculty = serializers.CharField()
    day = serializers.CharField()
    timeSlot = serializers.CharField()

class TimetableGenerateSerializer(serializers.Serializer):
    department = serializers.CharField()
    semester = serializers.CharField()
    academicYear = serializers.CharField()
    maxClassesPerDay = serializers.IntegerField()
    classrooms = ClassroomSerializer(many=True)
    batches = BatchSerializer(many=True)
    subjects = SubjectSerializer(many=True)
    faculty = FacultySerializer(many=True)
    fixedSlots = FixedSlotSerializer(many=True)