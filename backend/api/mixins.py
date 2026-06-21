from .models import ActivityLog


class ActivityLogMixin:
    """
    Mixin for ViewSets that need activity logging.
    Eliminates the duplicated _log_activity method across
    ProjectViewSet, MilestoneViewSet, and TaskViewSet.
    """

    def log_activity(self, action, entity_type, instance, metadata=None):
        if metadata is None:
            metadata = self._default_metadata(instance)
        ActivityLog.objects.create(
            user=self.request.user,
            action=action,
            entity_type=entity_type,
            entity_id=instance.id,
            metadata=metadata,
        )

    def _default_metadata(self, instance):
        if hasattr(instance, 'title'):
            return {'title': instance.title, 'status': getattr(instance, 'status', '')}
        return {'name': str(instance)}
