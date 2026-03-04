from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import json


class User(AbstractUser):
    """Modèle utilisateur étendu"""
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('member', 'Member'),
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
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
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_projects')
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
