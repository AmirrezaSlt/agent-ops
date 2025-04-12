from rest_framework.permissions import BasePermission

class AllowAnyForStorage(BasePermission):
    """
    Allow anonymous users to access file storage endpoints.
    This is useful for public buckets that need to be accessible without authentication.
    """
    def has_permission(self, request, view):
        return True 