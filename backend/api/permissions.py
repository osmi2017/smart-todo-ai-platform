from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Only SuperAdmins can access"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.role == 'superadmin'
        )


class IsCompanyAdmin(permissions.BasePermission):
    """Admin of the user's own company"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ('superadmin', 'admin')
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Permission: Admin peut tout faire, les autres en lecture seule"""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user.is_authenticated
            and request.user.role in ('superadmin', 'admin')
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permission: Propriétaire ou chef de projet peut modifier, les autres en lecture seule"""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # SuperAdmin can do anything
        if request.user.role == 'superadmin':
            return True

        # Admin of the same company
        if request.user.role == 'admin':
            if hasattr(obj, 'company') and obj.company == request.user.company:
                return True

        # Vérifier si l'utilisateur est le propriétaire
        if hasattr(obj, 'owner'):
            if obj.owner == request.user:
                return True

        # Vérifier si l'utilisateur est chef de projet
        if hasattr(obj, 'managers'):
            if obj.managers.filter(id=request.user.id).exists():
                return True

        if hasattr(obj, 'created_by'):
            if obj.created_by == request.user:
                return True
        elif hasattr(obj, 'author'):
            if obj.author == request.user:
                return True

        return False


class IsAssignedOrReadOnly(permissions.BasePermission):
    """Permission: Assigné peut modifier, les autres en lecture seule"""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if hasattr(obj, 'assigned_to'):
            return obj.assigned_to == request.user

        return False


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Permission personnalisée pour que seul l'auteur puisse modifier/supprimer
    Utilisé principalement pour les commentaires
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user


class HasGroupAccess(permissions.BasePermission):
    """Check that user belongs to the group that owns the project"""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == 'superadmin':
            return True

        # Admin of the same company has full access
        if user.role == 'admin' and hasattr(obj, 'company'):
            return obj.company == user.company

        # For projects: check group membership
        project = obj if hasattr(obj, 'groups') else getattr(obj, 'project', None)
        if project and project.groups.exists():
            return project.groups.filter(members=user).exists()

        # Fallback: same company
        if hasattr(obj, 'company'):
            return obj.company == user.company

        return True
