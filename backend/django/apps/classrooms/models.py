from django.db import models

class Classroom(models.Model):
    ROOM_TYPES = [
        ('lecture', 'Lecture Hall'),
        ('lab', 'Laboratory'),
    ]
    
    room_number = models.CharField(max_length=50, unique=True)
    capacity = models.IntegerField()
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default='lecture')
    department = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.room_number} ({self.capacity})"