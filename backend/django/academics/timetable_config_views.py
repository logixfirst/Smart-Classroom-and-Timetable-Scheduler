"""
Timetable Configuration API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .timetable_config_models import TimetableConfiguration
from .timetable_config_serializers import TimetableConfigurationSerializer


class TimetableConfigurationViewSet(viewsets.ModelViewSet):
    """
    API for timetable configuration CRUD
    
    GET /api/timetable-configs/ - List all configs
    GET /api/timetable-configs/last-used/ - Get last used config
    POST /api/timetable-configs/ - Create or update config
    PUT /api/timetable-configs/{id}/ - Update config
    DELETE /api/timetable-configs/{id}/ - Delete config
    """
    
    serializer_class = TimetableConfigurationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by organization"""
        if hasattr(self.request.user, 'organization'):
            return TimetableConfiguration.objects.filter(
                organization=self.request.user.organization
            )
        return TimetableConfiguration.objects.none()
    
    def create(self, request, *args, **kwargs):
        """
        Create or update configuration
        If config exists for same org + academic_year + semester, update it
        Otherwise create new
        """
        # Get organization from user
        if not hasattr(request.user, 'organization') or not request.user.organization:
            return Response(
                {'error': 'User organization not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        organization = request.user.organization
        academic_year = request.data.get('academic_year')
        semester = request.data.get('semester')
        
        if not academic_year or not semester:
            return Response(
                {'error': 'academic_year and semester are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if configuration exists for this org + academic_year + semester
        existing_config = TimetableConfiguration.objects.filter(
            organization=organization,
            academic_year=academic_year,
            semester=semester
        ).first()
        
        if existing_config:
            # Update existing configuration
            serializer = self.get_serializer(existing_config, data=request.data, partial=False)
            serializer.is_valid(raise_exception=True)
            config = serializer.save()
            
            return Response(
                {
                    'success': True,
                    'message': 'Configuration updated successfully',
                    'config': self.get_serializer(config).data,
                    'action': 'updated'
                },
                status=status.HTTP_200_OK
            )
        else:
            # Create new configuration
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            config = serializer.save(organization=organization)
            
            return Response(
                {
                    'success': True,
                    'message': 'Configuration created successfully',
                    'config': self.get_serializer(config).data,
                    'action': 'created'
                },
                status=status.HTTP_201_CREATED
            )
    
    @action(detail=False, methods=['get'])
    def last_used(self, request):
        """Get the last used configuration"""
        config = self.get_queryset().first()  # Already ordered by last_used_at
        
        if config:
            serializer = self.get_serializer(config)
            return Response(serializer.data)
        
        # Return default configuration if none exists
        return Response({
            'config_name': 'Default Configuration',
            'academic_year': '2024-25',
            'semester': 1,
            'working_days': 6,
            'slots_per_day': 8,
            'start_time': '08:00:00',
            'end_time': '17:00:00',
            'slot_duration_minutes': 60,
            'lunch_break_enabled': True,
            'lunch_break_start': '13:00:00',
            'lunch_break_end': '14:00:00',
            'selected_departments': [],
            'include_open_electives': True,
            'max_classes_per_day': 6,
            'min_gap_between_classes': 0,
            'avoid_first_last_slot': False,
            'faculty_max_continuous': 3,
            'optimization_priority': 'balanced',
            'minimize_faculty_travel': True,
            'prefer_morning_slots': False,
            'group_same_subject': True,
            'number_of_variants': 5,
            'timeout_minutes': 10,
            'allow_conflicts': False,
            'use_ai_optimization': True,
            'is_default': True
        })
    
    @action(detail=False, methods=['post'])
    def save_and_generate(self, request):
        """Save configuration and trigger timetable generation"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        config = serializer.save()
        
        # Return saved config
        return Response(
            self.get_serializer(config).data,
            status=status.HTTP_201_CREATED
        )
