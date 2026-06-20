/**
 * Shared constants for status/priority labels and colors used across the app.
 */

// --- Task Status ---
export const TASK_STATUS_COLORS = {
  todo: 'gray',
  in_progress: 'blue',
  review: 'purple',
  blocked: 'red',
  completed: 'green',
};

export const TASK_STATUS_LABELS = {
  todo: 'À faire',
  in_progress: 'En cours',
  review: 'En révision',
  blocked: 'Bloquée',
  completed: 'Terminée',
};

// --- Project Status ---
export const PROJECT_STATUS_COLORS = {
  not_started: 'gray',
  in_progress: 'blue',
  paused: 'orange',
  completed: 'green',
  archived: 'purple',
};

export const PROJECT_STATUS_LABELS = {
  not_started: 'Non démarré',
  in_progress: 'En cours',
  paused: 'En pause',
  completed: 'Terminé',
  archived: 'Archivé',
};

// --- Milestone Status ---
export const MILESTONE_STATUS_COLORS = {
  not_started: 'gray',
  in_progress: 'blue',
  completed: 'green',
  delayed: 'red',
  cancelled: 'purple',
};

export const MILESTONE_STATUS_LABELS = {
  not_started: 'Non démarré',
  in_progress: 'En cours',
  completed: 'Terminé',
  delayed: 'En retard',
  cancelled: 'Annulé',
};

// --- Priority ---
export const PRIORITY_COLORS = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };

export const PRIORITY_LABELS = { 1: 'Basse', 2: 'Moyenne', 3: 'Haute', 4: 'Critique' };

// --- Helpers ---
export const getStatusColor = (statusMap, status) => statusMap[status] || 'gray';
export const getStatusLabel = (labelMap, status) => labelMap[status] || status;
export const getPriorityColor = (priority) => PRIORITY_COLORS[priority] || 'gray';
export const getPriorityLabel = (priority) => PRIORITY_LABELS[priority] || priority;
