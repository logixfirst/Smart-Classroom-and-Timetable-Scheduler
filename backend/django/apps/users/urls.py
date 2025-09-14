from django.urls import path
from . import views

urlpatterns = [
    path('faculty/', views.get_faculty, name='get_faculty'),
    path('batches/', views.get_batches, name='get_batches'),
    path('faculty/create/', views.create_faculty, name='create_faculty'),
    path('batches/create/', views.create_batch, name='create_batch'),
]