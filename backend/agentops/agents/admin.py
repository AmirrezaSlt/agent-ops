from django.contrib import admin
from .models import Agent


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'role', 'created_at', 'updated_at')
    search_fields = ('name', 'role')
    list_filter = ('role',) 