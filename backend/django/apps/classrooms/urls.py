from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_classrooms, name='get_classrooms'),
    path('create/', views.create_classroom, name='create_classroom'),
]