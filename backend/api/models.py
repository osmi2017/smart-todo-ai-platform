import uuid

from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Company(models.Model):
    """Modèle Entreprise pour le multi-tenant"""
    STORAGE_TIER_CHOICES = (
        ('100MB', '100 Mo'),
        ('500MB', '500 Mo'),
        ('1GB', '1 Go'),
        ('5GB', '5 Go'),
        ('10GB', '10 Go'),
        ('50GB', '50 Go'),
        ('100GB', '100 Go'),
        ('unlimited', 'Illimité'),
    )

    STORAGE_TIER_BYTES = {
        '100MB': 100 * 1024 * 1024,
        '500MB': 500 * 1024 * 1024,
        '1GB': 1 * 1024 * 1024 * 1024,
        '5GB': 5 * 1024 * 1024 * 1024,
        '10GB': 10 * 1024 * 1024 * 1024,
        '50GB': 50 * 1024 * 1024 * 1024,
        '100GB': 100 * 1024 * 1024 * 1024,
        'unlimited': None,
    }

    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    storage_tier = models.CharField(max_length=20, choices=STORAGE_TIER_CHOICES, default='1GB')
    storage_used = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companies'
        verbose_name = 'Entreprise'
        verbose_name_plural = 'Entreprises'
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def storage_limit_bytes(self):
        return self.STORAGE_TIER_BYTES.get(self.storage_tier)

    @property
    def storage_remaining(self):
        limit = self.storage_limit_bytes
        if limit is None:
            return None
        return max(0, limit - self.storage_used)

    @property
    def storage_percent_used(self):
        limit = self.storage_limit_bytes
        if limit is None:
            return 0
        if limit == 0:
            return 100
        return round(self.storage_used / limit * 100, 1)

    def can_upload(self, file_size):
        limit = self.storage_limit_bytes
        if limit is None:
            return True
        return (self.storage_used + file_size) <= limit


class CompanyGroup(models.Model):
    """Groupe au sein d'une entreprise pour organiser les utilisateurs et contrôler l'accès aux projets"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='groups')
    members = models.ManyToManyField('User', related_name='company_groups', blank=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_groups'
        verbose_name = 'Groupe'
        verbose_name_plural = 'Groupes'
        unique_together = ['name', 'company']
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class User(AbstractUser):
    """Modèle utilisateur étendu"""
    ROLE_CHOICES = (
        ('superadmin', 'SuperAdmin'),
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    
    # Métriques pour ML
    avg_completion_time = models.FloatField(default=0, validators=[MinValueValidator(0)])
    delay_rate = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(1)])
    productivity_pattern = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['company']),
        ]
    
    def __str__(self):
        return f"{self.username} ({self.email})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username


class Project(models.Model):
    """Modèle Projet"""
    STATUS_CHOICES = (
        ('not_started', 'Non démarré'),
        ('in_progress', 'En cours'),
        ('paused', 'En pause'),
        ('completed', 'Terminé'),
        ('archived', 'Archivé'),
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    progress = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    risk_score = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Relations
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='projects', null=True, blank=True)
    groups = models.ManyToManyField(CompanyGroup, related_name='projects', blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_projects')
    managers = models.ManyToManyField(User, related_name='managed_projects', blank=True)
    members = models.ManyToManyField(User, related_name='projects', blank=True)
    
    # Métadonnées
    color = models.CharField(max_length=7, default='#4299E1')  # Code couleur hex
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']
        verbose_name = 'Projet'
        verbose_name_plural = 'Projets'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['company']),
        ]
    
    def __str__(self):
        return self.name
    
    def update_progress(self):
        """Met à jour la progression du projet basée sur les tâches"""
        tasks = self.tasks.all()
        if not tasks.exists():
            self.progress = 0
        else:
            completed_tasks = tasks.filter(status='completed').count()
            self.progress = (completed_tasks / tasks.count()) * 100
        self.save(update_fields=['progress'])
    
    def save(self, *args, **kwargs):
        if not self.start_date and not self.deadline:
            self.start_date = timezone.now().date()
        super().save(*args, **kwargs)


class Milestone(models.Model):
    """Modèle Milestone"""
    STATUS_CHOICES = (
        ('not_started', 'Non démarré'),
        ('in_progress', 'En cours'),
        ('completed', 'Complété'),
        ('delayed', 'En retard'),
        ('cancelled', 'Annulé'),
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    progress = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    risk_score = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Relations
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'milestones'
        ordering = ['due_date']
        verbose_name = 'Jalon'
        verbose_name_plural = 'Jalons'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['project', 'due_date']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.project.name}"
    
    def update_progress(self):
        """Met à jour la progression basée sur les tâches associées"""
        tasks = self.tasks.all()
        if not tasks.exists():
            self.progress = 0
            self.status = 'not_started'
        else:
            completed_tasks = tasks.filter(status='completed').count()
            total_tasks = tasks.count()
            self.progress = (completed_tasks / total_tasks) * 100
            
            # Mettre à jour le statut
            if self.progress == 100:
                self.status = 'completed'
            elif self.progress > 0:
                if self.due_date < timezone.now().date() and self.progress < 100:
                    self.status = 'delayed'
                else:
                    self.status = 'in_progress'
            else:
                self.status = 'not_started'
        
        self.save(update_fields=['progress', 'status'])


class Task(models.Model):
    """Modèle Tâche"""
    PRIORITY_CHOICES = (
        (1, 'Basse'),
        (2, 'Moyenne'),
        (3, 'Haute'),
        (4, 'Critique'),
    )
    
    STATUS_CHOICES = (
        ('todo', 'À faire'),
        ('in_progress', 'En cours'),
        ('review', 'En révision'),
        ('blocked', 'Bloquée'),
        ('completed', 'Terminée'),
    )
    
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    deadline = models.DateField(null=True, blank=True)
    estimated_time = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])  # en heures
    actual_time = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])  # en heures
    
    # Champs ML (peuplés par le service ML)
    predicted_time = models.FloatField(null=True, blank=True)
    delay_probability = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(1)])
    predicted_priority = models.IntegerField(null=True, blank=True, choices=PRIORITY_CHOICES)
    
    # Métadonnées
    tags = models.JSONField(default=list, blank=True)
    checklist = models.JSONField(default=list, blank=True)
    attachments = models.JSONField(default=list, blank=True)  # Stockage URLs des fichiers
    order = models.IntegerField(default=0)  # Pour l'ordre dans Kanban
    
    # Relations
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    milestone = models.ForeignKey(Milestone, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    
    # Dépendances
    dependencies = models.ManyToManyField('self', symmetrical=False, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['order', 'priority', 'deadline']
        verbose_name = 'Tâche'
        verbose_name_plural = 'Tâches'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['project', 'status']),
            models.Index(fields=['assigned_to', 'status']),
        ]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        # Si la tâche est marquée comme terminée
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
            if not self.actual_time and self.created_at:
                # Calculer le temps passé
                time_spent = (self.completed_at - self.created_at).total_seconds() / 3600
                self.actual_time = time_spent
        
        super().save(*args, **kwargs)
        
        # Mettre à jour les progressions
        if self.milestone:
            self.milestone.update_progress()
        self.project.update_progress()
    
    @property
    def is_delayed(self):
        """Vérifie si la tâche est en retard"""
        if self.deadline and self.status != 'completed':
            return self.deadline < timezone.now().date()
        return False


class ActivityLog(models.Model):
    """Journal d'activité pour le ML"""
    ACTION_CHOICES = (
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('view', 'Consultation'),
        ('complete', 'Complétion'),
        ('assign', 'Assignation'),
        ('comment', 'Commentaire'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=50)  # 'task', 'project', 'milestone'
    entity_id = models.IntegerField()
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']
        verbose_name = "Journal d'activité"
        verbose_name_plural = "Journaux d'activité"
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['action', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.entity_type} - {self.created_at}"


# UN SEUL MODÈLE COMMENT - J'ai supprimé la première définition
class Comment(models.Model):
    """Modèle pour les commentaires sur les tâches"""
    content = models.TextField()
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='replies'
    )
    
    # Métadonnées
    edited = models.BooleanField(default=False)
    attachments = models.JSONField(default=list, blank=True)
    mentions = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['task', '-created_at']),
            models.Index(fields=['author', '-created_at']),
        ]
    
    def __str__(self):
        return f"Commentaire de {self.author} sur {self.task}"
        
class Notification(models.Model):
    """Modèle pour les notifications"""
    NOTIFICATION_TYPES = (
        ('task_assigned', 'Tâche assignée'),
        ('task_completed', 'Tâche terminée'),
        ('task_delayed', 'Tâche en retard'),
        ('comment_added', 'Commentaire ajouté'),
        ('member_added', 'Membre ajouté'),
        ('milestone_due', 'Jalon à échéance'),
        ('meeting_reminder', 'Rappel de réunion'),
        ('meeting_started', 'Réunion démarrée'),
        ('meeting_completed', 'Réunion terminée'),
        ('project_created', 'Projet créé'),
        ('meeting_processing', 'Traitement de réunion en cours'),
        ('meeting_processed', 'Réunion traitée par l\'IA'),
        ('report_processing', 'Génération de rapport en cours'),
        ('report_ready', 'Rapport de projet prêt'),
        ('task_failed', 'Échec d\'une tâche en arrière-plan'),
    )
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]
    
    def __str__(self):
        return f"Notification pour {self.recipient}: {self.title}"


class Meeting(models.Model):
    """AI Meeting model"""
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    INPUT_TYPE_CHOICES = (
        ('audio', 'Audio Upload'),
        ('text', 'Text Notes'),
        ('both', 'Audio + Text'),
    )

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    input_type = models.CharField(max_length=10, choices=INPUT_TYPE_CHOICES, default='text')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    # Content
    audio_file = models.FileField(upload_to='meetings/audio/', null=True, blank=True)
    raw_notes = models.TextField(blank=True)
    transcript = models.TextField(blank=True)

    # Relations
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_meetings')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='meetings')

    # AI processing
    ai_processed = models.BooleanField(default=False)
    ai_processing_error = models.TextField(blank=True)

    # External integrations
    google_calendar_event_id = models.CharField(max_length=255, blank=True)
    slack_channel_id = models.CharField(max_length=255, blank=True)

    # Rappels (gérés par Celery Beat, cf. api/tasks.py)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'meetings'
        ordering = ['-scheduled_at', '-created_at']
        indexes = [
            models.Index(fields=['organizer', '-scheduled_at']),
            models.Index(fields=['status']),
            models.Index(fields=['project', '-scheduled_at']),
        ]

    def __str__(self):
        return self.title

    @property
    def is_past(self):
        if self.scheduled_at:
            return self.scheduled_at < timezone.now()
        return False


class MeetingParticipant(models.Model):
    """Participants in a meeting"""
    ROLE_CHOICES = (
        ('organizer', 'Organizer'),
        ('presenter', 'Presenter'),
        ('attendee', 'Attendee'),
        ('optional', 'Optional'),
    )

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meeting_participations')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='attendee')
    attended = models.BooleanField(default=False)

    class Meta:
        db_table = 'meeting_participants'
        unique_together = ['meeting', 'user']

    def __str__(self):
        return f"{self.user.username} - {self.meeting.title}"


class MeetingSummary(models.Model):
    """AI-generated meeting summary"""
    meeting = models.OneToOneField(Meeting, on_delete=models.CASCADE, related_name='summary')
    summary_text = models.TextField()
    key_points = models.JSONField(default=list, blank=True)
    decisions = models.JSONField(default=list, blank=True)
    follow_ups = models.JSONField(default=list, blank=True)

    generated_at = models.DateTimeField(auto_now_add=True)
    model_used = models.CharField(max_length=50, default='gpt-4')

    class Meta:
        db_table = 'meeting_summaries'

    def __str__(self):
        return f"Summary: {self.meeting.title}"


class MeetingActionItem(models.Model):
    """Action items extracted from meetings by AI"""
    PRIORITY_CHOICES = (
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
        (4, 'Critical'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='action_items')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    deadline = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='meeting_action_items')

    # Link to project task if converted
    linked_task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name='source_action_item')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'meeting_action_items'
        ordering = ['priority', 'deadline']
        indexes = [
            models.Index(fields=['meeting', 'status']),
            models.Index(fields=['assigned_to', 'status']),
        ]

    def __str__(self):
        return self.title

    def convert_to_task(self, project):
        """Convert this action item into a project Task"""
        task = Task.objects.create(
            title=self.title,
            description=self.description,
            priority=self.priority,
            status='todo',
            deadline=self.deadline,
            project=project,
            assigned_to=self.assigned_to,
            created_by=self.meeting.organizer,
        )
        self.linked_task = task
        self.save(update_fields=['linked_task'])
        return task


def file_upload_path(instance, filename):
    return f'files/company_{instance.company_id}/{filename}'


class File(models.Model):
    """Fichier uploadé dans une entreprise"""
    ALLOWED_MIME_PREFIXES = ('application/pdf', 'image/', 'video/', 'text/', 'application/')

    name = models.CharField(max_length=500)
    file = models.FileField(upload_to=file_upload_path)
    mime_type = models.CharField(max_length=255)
    size_bytes = models.BigIntegerField()
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='uploaded_files')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'files'
        verbose_name = 'Fichier'
        verbose_name_plural = 'Fichiers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'uploaded_by']),
            models.Index(fields=['mime_type']),
        ]

    def __str__(self):
        return self.name

    @property
    def is_previewable(self):
        if not self.mime_type:
            return False
        return (
            self.mime_type.startswith('image/')
            or self.mime_type.startswith('video/')
            or self.mime_type == 'application/pdf'
        )

    def delete(self, *args, **kwargs):
        company = self.company
        file_size = self.size_bytes
        self.file.delete(save=False)
        super().delete(*args, **kwargs)
        company.storage_used = max(0, company.storage_used - file_size)
        company.save(update_fields=['storage_used'])


class FileShare(models.Model):
    """Partage d'un fichier avec un utilisateur ou un groupe"""
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='shares')
    shared_with_user = models.ForeignKey(
        'User', on_delete=models.CASCADE, null=True, blank=True, related_name='shared_files'
    )
    shared_with_group = models.ForeignKey(
        CompanyGroup, on_delete=models.CASCADE, null=True, blank=True, related_name='shared_files'
    )
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    shared_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='file_shares_given')
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'file_shares'
        verbose_name = 'Partage de fichier'
        verbose_name_plural = 'Partages de fichiers'
        ordering = ['-shared_at']

    def __str__(self):
        target = self.shared_with_user or self.shared_with_group
        return f'{self.file.name} -> {target}'


class StorageNotification(models.Model):
    """Notification envoyée quand le quota de stockage est atteint"""
    NOTIFICATION_TYPES = (
        ('warning_80', 'Avertissement 80%'),
        ('warning_90', 'Avertissement 90%'),
        ('quota_reached', 'Quota atteint'),
    )

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='storage_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'storage_notifications'
        verbose_name = 'Notification de stockage'
        verbose_name_plural = 'Notifications de stockage'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.company.name} - {self.notification_type}'


class AuditEvent(models.Model):
    """Trace persistée de chaque événement majeur consommé depuis Kafka.

    Alimenté exclusivement par le consommateur d'audit (cf. management
    command consume_audit_events), totalement découplé des services qui
    produisent les événements : même si ce consommateur est arrêté un moment,
    Kafka conserve les événements et l'audit reprend sans perte dès son
    redémarrage (rejeu depuis le dernier offset commité).
    """
    event_id = models.UUIDField(unique=True)
    event_type = models.CharField(max_length=100)
    topic = models.CharField(max_length=150)
    source_service = models.CharField(max_length=100, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(help_text="Horodatage d'émission de l'événement (côté producteur)")
    consumed_at = models.DateTimeField(auto_now_add=True, help_text="Horodatage de consommation (côté audit)")

    class Meta:
        db_table = 'audit_events'
        verbose_name = "Événement d'audit"
        verbose_name_plural = "Événements d'audit"
        ordering = ['-occurred_at']
        indexes = [
            models.Index(fields=['event_type', '-occurred_at']),
            models.Index(fields=['topic', '-occurred_at']),
        ]

    def __str__(self):
        return f'{self.event_type} ({self.event_id})'

