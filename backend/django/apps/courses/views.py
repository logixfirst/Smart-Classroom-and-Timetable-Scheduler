from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Course

@api_view(['GET'])
@permission_classes([])
def get_courses(request):
    department = request.GET.get('department')
    semester = request.GET.get('semester')
    
    courses = Course.objects.all()
    if department:
        courses = courses.filter(department=department)
    if semester:
        courses = courses.filter(semester=semester)
    
    data = [{
        'id': course.code,
        'name': course.name,
        'code': course.code,
        'classesPerWeek': course.classes_per_week
    } for course in courses]
    
    return Response(data)

@api_view(['POST'])
@permission_classes([])
def create_course(request):
    Course.objects.create(
        name=request.data['name'],
        code=request.data['code'],
        department=request.data['department'],
        semester=request.data['semester'],
        classes_per_week=request.data.get('classes_per_week', 3)
    )
    return Response({'message': 'Course created successfully'})