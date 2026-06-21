from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import (
    User, Project, Milestone, Task, 
    ActivityLog, Comment, Notification,
    Meeting, MeetingParticipant, MeetingSummary, MeetingActionItem,
)

# ----------------------------------------------------------------------
# User Admin
# ----------------------------------------------------------------------
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    readonly_fields = ('last_login', 'date_joined')
    fieldsets = (
        ('Informations personnelles', {
            'fields': ('username', 'email', 'first_name', 'last_name', 'avatar', 'bio')
        }),
        ('Rôle & Permissions', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Métriques ML', {
            'fields': ('avg_completion_time', 'delay_rate', 'productivity_pattern'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )


# ----------------------------------------------------------------------
# Project Admin
# ----------------------------------------------------------------------
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'progress_bar', 'risk_score', 'owner', 'deadline', 'created_at')
    list_filter = ('status', 'is_active', 'created_at')
    search_fields = ('name', 'description', 'owner__username')
    readonly_fields = ('progress', 'risk_score', 'created_at', 'updated_at')
    filter_horizontal = ('members',)
    date_hierarchy = 'created_at'
    
    def progress_bar(self, obj):
        color = 'green' if obj.progress >= 70 else 'orange' if obj.progress >= 30 else 'red'
        return format_html(
            '<div style="width:100px; height:20px; background-color:#edf2f7;">'
            '<div style="width:{}px; height:20px; background-color:{}; text-align:center; color:black;">{}%</div>'
            '</div>',
            obj.progress, color, obj.progress
        )
    progress_bar.short_description = 'Progression'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('owner').prefetch_related('members')


# ----------------------------------------------------------------------
# Milestone Admin
# ----------------------------------------------------------------------
@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'status', 'progress', 'due_date', 'risk_score')
    list_filter = ('status', 'due_date', 'project')
    search_fields = ('name', 'description', 'project__name')
    readonly_fields = ('progress', 'risk_score', 'created_at', 'updated_at')
    date_hierarchy = 'due_date'


# ----------------------------------------------------------------------
# Task Admin
# ----------------------------------------------------------------------
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'status', 'priority', 'assigned_to', 'deadline', 'is_delayed_display')
    list_filter = ('status', 'priority', 'project', 'assigned_to', 'created_at')
    search_fields = ('title', 'description', 'project__name')
    readonly_fields = ('predicted_time', 'delay_probability', 'predicted_priority', 'created_at', 'updated_at', 'completed_at')
    filter_horizontal = ('dependencies',)
    list_editable = ('status', 'priority')
    list_select_related = ('project', 'assigned_to')
    
    def status_colored(self, obj):
        colors = {
            'todo': '#718096',
            'in_progress': '#3182CE',
            'review': '#ED8936',
            'blocked': '#E53E3E',
            'completed': '#38A169',
        }
        return format_html(
            '<span style="background-color:{}; color:white; padding:3px 10px; border-radius:12px;">{}</span>',
            colors.get(obj.status, '#718096'),
            obj.get_status_display()
        )
    status_colored.short_description = 'Statut'
    
    def priority_colored(self, obj):
        colors = {1: '#718096', 2: '#3182CE', 3: '#ED8936', 4: '#E53E3E'}
        return format_html(
            '<span style="color:{}; font-weight:bold;">{}</span>',
            colors.get(obj.priority, '#718096'),
            obj.get_priority_display()
        )
    priority_colored.short_description = 'Priorité'
    
    def is_delayed_display(self, obj):
        if obj.is_delayed:
            return format_html('<span style="color:#E53E3E;">🔴 En retard</span>')
        return format_html('<span style="color:#38A169;">✅ Dans les temps</span>')
    is_delayed_display.short_description = 'Statut délai'


# ----------------------------------------------------------------------
# ActivityLog Admin
# ----------------------------------------------------------------------
@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'entity_type', 'entity_id', 'created_at')
    list_filter = ('action', 'entity_type', 'created_at')
    search_fields = ('user__username', 'metadata')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    list_select_related = ('user',)


# ----------------------------------------------------------------------
# Comment Admin
# ----------------------------------------------------------------------
@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'task', 'short_content', 'created_at', 'edited')
    list_filter = ('created_at', 'author', 'edited')
    search_fields = ('content', 'author__username', 'task__title')
    readonly_fields = ('created_at', 'updated_at')
    list_select_related = ('author', 'task')
    
    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    short_content.short_description = 'Commentaire'


# ----------------------------------------------------------------------
# Notification Admin
# ----------------------------------------------------------------------
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'recipient__username')
    readonly_fields = ('created_at',)
    list_select_related = ('recipient',)
    date_hierarchy = 'created_at'


# ----------------------------------------------------------------------
# Meeting Admin
# ----------------------------------------------------------------------
class MeetingParticipantInline(admin.TabularInline):
    model = MeetingParticipant
    extra = 0


class MeetingActionItemInline(admin.TabularInline):
    model = MeetingActionItem
    extra = 0
    readonly_fields = ('linked_task',)


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'organizer', 'scheduled_at', 'ai_processed', 'created_at')
    list_filter = ('status', 'ai_processed', 'input_type', 'created_at')
    search_fields = ('title', 'description', 'organizer__username')
    readonly_fields = ('created_at', 'updated_at', 'ai_processed')
    list_select_related = ('organizer', 'project')
    inlines = [MeetingParticipantInline, MeetingActionItemInline]
    date_hierarchy = 'created_at'


@admin.register(MeetingSummary)
class MeetingSummaryAdmin(admin.ModelAdmin):
    list_display = ('meeting', 'model_used', 'generated_at')
    readonly_fields = ('generated_at',)
    list_select_related = ('meeting',)


@admin.register(MeetingActionItem)
class MeetingActionItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'meeting', 'priority', 'status', 'assigned_to', 'deadline')
    list_filter = ('status', 'priority')
    search_fields = ('title', 'description')
    list_select_related = ('meeting', 'assigned_to', 'linked_task')
