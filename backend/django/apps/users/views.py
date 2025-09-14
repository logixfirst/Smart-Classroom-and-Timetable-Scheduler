from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Faculty, Batch

@api_view(['GET'])
@permission_classes([])
def get_faculty(request):
    faculty = Faculty.objects.select_related('user').all()
    
    data = [{
        'id': f.user.username,
        'name': f"{f.user.first_name} {f.user.last_name}".strip() or f.user.username
    } for f in faculty]
    
    return Response(data)

@api_view(['GET'])
@permission_classes([])
def get_batches(request):
    department = request.GET.get('department')
    semester = request.GET.get('semester')
    
    batches = Batch.objects.all()
    if department:
        batches = batches.filter(department=department)
    if semester:
        batches = batches.filter(semester=semester)
    
    data = [{
        'id': batch.name,
        'name': batch.name,
        'strength': batch.strength
    } for batch in batches]
    
    return Response(data)

@api_view(['POST'])
@permission_classes([])
def create_faculty(request):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user = User.objects.create(
        username=request.data['username'],
        first_name=request.data.get('first_name', ''),
        last_name=request.data.get('last_name', ''),
        role='faculty',
        department=request.data.get('department', '')
    )
    
    Faculty.objects.create(
        user=user,
        employee_id=request.data['employee_id'],
        specialization=request.data.get('specialization', '')
    )
    
    return Response({'message': 'Faculty created successfully'})

@api_view(['POST'])
@permission_classes([])
def create_batch(request):
    Batch.objects.create(
        name=request.data['name'],
        department=request.data['department'],
        semester=request.data['semester'],
        strength=request.data['strength'],
        academic_year=request.data['academic_year']
    )
    return Response({'message': 'Batch created successfully'})