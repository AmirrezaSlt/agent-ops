from django.urls import path
from .views import FileView

urlpatterns = [
    path('files/', FileView.as_view(), name='file-list'),
    path('files/<path:file_path>/', FileView.as_view(), name='file-detail'),
] 