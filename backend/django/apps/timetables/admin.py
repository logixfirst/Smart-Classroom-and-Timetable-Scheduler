from django.contrib import admin
from .models import Timetable

@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = ['name', 'department', 'semester', 'status', 'score', 'created_at']
    list_filter = ['status', 'department', 'semester']
    search_fields = ['name', 'department']
    readonly_fields = ['created_at', 'updated_at']