from django.urls import path
from . import views, workflow_views

urlpatterns = [
    path('', workflow_views.list_all_timetables, name='list_all_timetables'),
    path('generate/', views.generate_timetable, name='generate_timetable'),
    path('pending/', workflow_views.list_timetables, name='list_timetables'),
    path('<int:timetable_id>/', workflow_views.get_timetable_detail, name='get_timetable_detail'),
    path('<int:timetable_id>/approve/', workflow_views.approve_timetable, name='approve_timetable'),
    path('<int:timetable_id>/reject/', workflow_views.reject_timetable, name='reject_timetable'),
    path('approved/', workflow_views.get_approved_timetable, name='get_approved_timetable'),
]