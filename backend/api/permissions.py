from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """Permission: Admin peut tout faire, les autres en lecture seule"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'admin'


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permission: Propriétaire peut modifier, les autres en lecture seule"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Vérifier si l'utilisateur est le propriétaire
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsAssignedOrReadOnly(permissions.BasePermission):
    """Permission: Assigné peut modifier, les autres en lecture seule"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if hasattr(obj, 'assigned_to'):
            return obj.assigned_to == request.user
        
        return False
