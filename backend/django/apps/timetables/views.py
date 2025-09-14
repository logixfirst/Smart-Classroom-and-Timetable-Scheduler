import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.shortcuts import get_object_or_404
from .serializers import TimetableGenerateSerializer
from .models import Timetable

@api_view(['POST'])
@permission_classes([])
def generate_timetable(request):
    serializer = TimetableGenerateSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'error': 'Invalid data',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Forward to FastAPI AI service
        fastapi_url = getattr(settings, 'FASTAPI_AI_SERVICE_URL', 'http://localhost:8001')
        response = requests.post(
            f"{fastapi_url}/generate-timetable",
            json=serializer.validated_data,
            timeout=60
        )
        
        if response.status_code == 200:
            ai_response = response.json()
            
            # Save generated options to database
            if ai_response.get('success') and ai_response.get('options'):
                saved_options = []
                for option in ai_response['options']:
                    timetable = Timetable.objects.create(
                        name=f"{serializer.validated_data['department']} Sem {serializer.validated_data['semester']} - Option {option['id']}",
                        department=serializer.validated_data['department'],
                        semester=serializer.validated_data['semester'],
                        academic_year=serializer.validated_data['academicYear'],
                        status='pending',
                        schedule_data=option['schedule'],
                        score=option['score'],
                        conflicts=option['conflicts'],
                        created_by=None
                    )
                    saved_options.append({
                        'id': timetable.id,
                        'name': timetable.name,
                        'score': timetable.score,
                        'conflicts': timetable.conflicts,
                        'schedule': timetable.schedule_data
                    })
                
                return Response({
                    'success': True,
                    'options': saved_options
                })
            
            return Response(ai_response)
        else:
            return Response({
                'error': 'AI service error',
                'details': response.json() if response.content else 'Service unavailable'
            }, status=response.status_code)
            
    except requests.exceptions.RequestException as e:
        return Response({
            'error': 'Failed to connect to AI service',
            'details': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)