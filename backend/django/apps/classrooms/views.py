from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Classroom

@api_view(['GET'])
@permission_classes([])
def get_classrooms(request):
    classrooms = Classroom.objects.all()
    
    data = [{
        'id': classroom.room_number,
        'roomNumber': classroom.room_number,
        'capacity': classroom.capacity,
        'type': classroom.room_type
    } for classroom in classrooms]
    
    return Response(data)

@api_view(['POST'])
@permission_classes([])
def create_classroom(request):
    Classroom.objects.create(
        room_number=request.data['room_number'],
        capacity=request.data['capacity'],
        room_type=request.data.get('room_type', 'lecture'),
        department=request.data.get('department', '')
    )
    return Response({'message': 'Classroom created successfully'})