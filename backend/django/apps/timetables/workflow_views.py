from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Timetable
from django.db.models import Q

@api_view(['GET'])
@permission_classes([])
def list_timetables(request):
    timetables = Timetable.objects.filter(status='pending')
    data = [{
        'id': t.id,
        'name': t.name,
        'department': t.department,
        'semester': t.semester,
        'score': t.score,
        'conflicts': t.conflicts,
        'schedule': t.schedule_data,
        'created_at': t.created_at
    } for t in timetables]
    
    return Response({'timetables': data})

@api_view(['POST'])
@permission_classes([])
def approve_timetable(request, timetable_id):
    timetable = get_object_or_404(Timetable, id=timetable_id)
    
    # Reject all other timetables for same department/semester
    Timetable.objects.filter(
        department=timetable.department,
        semester=timetable.semester,
        status__in=['pending', 'approved']
    ).exclude(id=timetable_id).update(status='rejected')
    
    timetable.status = 'approved'
    timetable.save()
    
    return Response({'message': 'Timetable approved successfully'})

@api_view(['POST'])
@permission_classes([])
def reject_timetable(request, timetable_id):
    timetable = get_object_or_404(Timetable, id=timetable_id)
    timetable.status = 'rejected'
    timetable.save()
    
    return Response({'message': 'Timetable rejected successfully'})

@api_view(['GET'])
@permission_classes([])
def list_all_timetables(request):
    status_filter = request.GET.get('status')
    
    timetables = Timetable.objects.all().order_by('-created_at')
    if status_filter and status_filter != 'all':
        timetables = timetables.filter(status=status_filter)
    
    data = [{
        'id': t.id,
        'name': t.name,
        'department': t.department,
        'semester': t.semester,
        'status': t.status,
        'score': t.score,
        'conflicts': t.conflicts,
        'created_at': t.created_at
    } for t in timetables]
    
    return Response({'timetables': data})

@api_view(['GET'])
@permission_classes([])
def get_timetable_detail(request, timetable_id):
    timetable = get_object_or_404(Timetable, id=timetable_id)
    
    # For now, we'll simulate multiple options by creating variations
    # In a real implementation, you'd store multiple options per generation
    options = [{
        'id': timetable.id,
        'score': timetable.score,
        'conflicts': timetable.conflicts,
        'schedule': timetable.schedule_data
    }]
    
    return Response({
        'id': timetable.id,
        'name': timetable.name,
        'department': timetable.department,
        'semester': timetable.semester,
        'status': timetable.status,
        'options': options
    })

@api_view(['GET'])
def get_approved_timetable(request):
    department = request.GET.get('department')
    semester = request.GET.get('semester')
    
    query = Timetable.objects.filter(status='approved')
    if department:
        query = query.filter(department=department)
    if semester:
        query = query.filter(semester=semester)
    
    timetable = query.first()
    if not timetable:
        return Response({'error': 'No approved timetable found'}, status=404)
    
    return Response({
        'id': timetable.id,
        'name': timetable.name,
        'department': timetable.department,
        'semester': timetable.semester,
        'schedule': timetable.schedule_data
    })