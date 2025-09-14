from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Staff'),
        ('faculty', 'Faculty'),
        ('student', 'Student'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    
    def __str__(self):
        return f"{self.username} ({self.role})"

class Faculty(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    employee_id = models.CharField(max_length=50, unique=True)
    specialization = models.CharField(max_length=100, blank=True)
    max_hours_per_week = models.IntegerField(default=20)
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

class Batch(models.Model):
    name = models.CharField(max_length=50)
    department = models.CharField(max_length=100)
    semester = models.CharField(max_length=20)
    strength = models.IntegerField()
    academic_year = models.CharField(max_length=20)
    
    def __str__(self):
        return f"{self.department} Sem {self.semester} - {self.name}"