from django.contrib import admin
from django.urls import path, include
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('agentops.agents.urls')),
    path('api/', include('storage.urls')),
]

# Adjust URL patterns with base path if needed
if settings.BASE_PATH and settings.BASE_PATH != '/':
    # Remove the leading slash from base path to avoid double slashes
    base_path = settings.BASE_PATH.lstrip('/')
    urlpatterns = [
        path(f'{base_path}/', include(urlpatterns))
    ] 