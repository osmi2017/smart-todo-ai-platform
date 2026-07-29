import i18n from '../i18n';

// --- Task Status ---
export const TASK_STATUS_COLORS = {
  todo: 'gray',
  in_progress: 'blue',
  review: 'purple',
  blocked: 'red',
  completed: 'green',
};

export const getTaskStatusLabel = (status) => {
  const labels = {
    todo: i18n.t('common.todo'),
    in_progress: i18n.t('common.inProgress'),
    review: i18n.t('common.review'),
    blocked: i18n.t('common.blocked'),
    completed: i18n.t('common.completed'),
  };
  return labels[status] || status;
};

// --- Project Status ---
export const PROJECT_STATUS_COLORS = {
  not_started: 'gray',
  in_progress: 'blue',
  paused: 'orange',
  completed: 'green',
  archived: 'purple',
};

export const getProjectStatusLabel = (status) => {
  const labels = {
    not_started: i18n.t('common.notStarted'),
    in_progress: i18n.t('common.inProgress'),
    paused: i18n.t('common.paused'),
    completed: i18n.t('common.completed'),
    archived: i18n.t('common.archived'),
  };
  return labels[status] || status;
};

// --- Milestone Status ---
export const MILESTONE_STATUS_COLORS = {
  not_started: 'gray',
  in_progress: 'blue',
  completed: 'green',
  delayed: 'red',
  cancelled: 'purple',
};

export const getMilestoneStatusLabel = (status) => {
  const labels = {
    not_started: i18n.t('common.notStarted'),
    in_progress: i18n.t('common.inProgress'),
    completed: i18n.t('common.completed'),
    delayed: i18n.t('common.delayed'),
    cancelled: i18n.t('common.cancelled'),
  };
  return labels[status] || status;
};

// --- Priority ---
export const PRIORITY_COLORS = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };

export const getPriorityLabel = (priority) => {
  const labels = {
    1: i18n.t('common.low'),
    2: i18n.t('common.medium'),
    3: i18n.t('common.high'),
    4: i18n.t('common.critical'),
  };
  return labels[priority] || priority;
};

// --- Legacy helpers (kept for backward compatibility) ---
export const getStatusColor = (statusMap, status) => statusMap[status] || 'gray';
export const getStatusLabel = (labelMap, status) => {
  if (typeof labelMap === 'function') return labelMap(status);
  return labelMap[status] || status;
};
export const getPriorityColor = (priority) => PRIORITY_COLORS[priority] || 'gray';
