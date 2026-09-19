import { api } from './client';

export const authService = {
  login: (username, password) =>
    api.post('/auth/login/', { username, password }).then((r) => r.data),
  register: (data) => api.post('/auth/register/', data).then((r) => r.data),
  logout: () => api.post('/auth/logout/').then((r) => r.data),
  me: () => api.get('/auth/me/').then((r) => r.data),
};

export const dashboardService = {
  stats: (timeRange = 'week') =>
    api.get('/tasks/dashboard/', { params: { time_range: timeRange } }).then((r) => r.data),
  analytics: (range = 'week') =>
    api.get('/tasks/analytics/', { params: { range } }).then((r) => r.data),
};

export const projectService = {
  list: () => api.get('/projects/').then((r) => r.data),
  get: (id) => api.get(`/projects/${id}/`).then((r) => r.data),
  create: (data) => api.post('/projects/', data).then((r) => r.data),
  update: (id, data) => api.put(`/projects/${id}/`, data).then((r) => r.data),
  patchStatus: (id, status) =>
    api.patch(`/projects/${id}/`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/projects/${id}/`).then((r) => r.data),
  stats: (id) => api.get(`/projects/${id}/stats/`).then((r) => r.data),
  addMember: (id, userId) =>
    api.post(`/projects/${id}/add_member/`, { user_id: userId }).then((r) => r.data),
  removeMember: (id, userId) =>
    api.delete(`/projects/${id}/remove_member/`, { data: { user_id: userId } }).then((r) => r.data),
};

export const taskService = {
  list: (params = {}) => api.get('/tasks/', { params }).then((r) => r.data),
  get: (id) => api.get(`/tasks/${id}/`).then((r) => r.data),
  create: (data) => api.post('/tasks/', data).then((r) => r.data),
  update: (id, data) => api.put(`/tasks/${id}/`, data).then((r) => r.data),
  patch: (id, data) => api.patch(`/tasks/${id}/`, data).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}/`).then((r) => r.data),
  predict: (id) => api.post(`/tasks/${id}/predict/`).then((r) => r.data),
};

export const milestoneService = {
  list: () => api.get('/milestones/').then((r) => r.data),
  get: (id) => api.get(`/milestones/${id}/`).then((r) => r.data),
  create: (data) => api.post('/milestones/', data).then((r) => r.data),
  update: (id, data) => api.put(`/milestones/${id}/`, data).then((r) => r.data),
  remove: (id) => api.delete(`/milestones/${id}/`).then((r) => r.data),
  predictRisk: (id) => api.post(`/milestones/${id}/predict_risk/`).then((r) => r.data),
};

export const meetingService = {
  list: () => api.get('/meetings/').then((r) => r.data),
  get: (id) => api.get(`/meetings/${id}/`).then((r) => r.data),
  create: (data) => api.post('/meetings/', data).then((r) => r.data),
  update: (id, data) => api.patch(`/meetings/${id}/`, data).then((r) => r.data),
  remove: (id) => api.delete(`/meetings/${id}/`).then((r) => r.data),
  process: (id) => api.post(`/meetings/${id}/process/`).then((r) => r.data),
  transcribe: (id) => api.post(`/meetings/${id}/transcribe/`).then((r) => r.data),
  chatMessages: (meetingId) =>
    api.get('/meeting-chat-messages/', { params: { meeting: meetingId } }).then((r) => r.data),
  sendChat: (meetingId, message) =>
    api.post('/meeting-chat-messages/', { meeting: meetingId, message }).then((r) => r.data),
};

export const notificationService = {
  list: (limit = 50) => api.get('/notifications/', { params: { limit } }).then((r) => r.data),
  markRead: (id) => api.post(`/notifications/${id}/read/`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/mark-all-read/').then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count/').then((r) => r.data),
};

export const commentService = {
  list: (taskId) => api.get('/comments/', { params: { task: taskId } }).then((r) => r.data),
  create: ({ content, task, parent }) => api.post('/comments/', { content, task, parent }).then((r) => r.data),
  reply: (id, content) => api.post(`/comments/${id}/reply/`, { content }).then((r) => r.data),
  remove: (id) => api.delete(`/comments/${id}/`).then((r) => r.data),
};

export const fileService = {
  list: () => api.get('/files/').then((r) => r.data),
  storageInfo: () => api.get('/files/storage_info/').then((r) => r.data),
  remove: (id) => api.delete(`/files/${id}/`).then((r) => r.data),
};

export const userService = {
  list: () => api.get('/users/').then((r) => r.data),
  create: (data) => api.post('/users/', data).then((r) => r.data),
  update: (id, data) => api.patch(`/users/${id}/`, data).then((r) => r.data),
  remove: (id) => api.delete(`/users/${id}/`).then((r) => r.data),
};

export const companyService = {
  list: () => api.get('/companies/').then((r) => r.data),
  create: (data) => api.post('/companies/', data).then((r) => r.data),
  update: (id, data) => api.patch(`/companies/${id}/`, data).then((r) => r.data),
  remove: (id) => api.delete(`/companies/${id}/`).then((r) => r.data),
};

export const missionService = {
  list: () => api.get('/missions/').then((r) => r.data),
  get: (id) => api.get(`/missions/${id}/`).then((r) => r.data),
  create: (data) => api.post('/missions/', data).then((r) => r.data),
  update: (id, data) => api.put(`/missions/${id}/`, data).then((r) => r.data),
  remove: (id) => api.delete(`/missions/${id}/`).then((r) => r.data),
  start: (id) => api.post(`/missions/${id}/start_mission/`).then((r) => r.data),
  end: (id) => api.post(`/missions/${id}/end_mission/`).then((r) => r.data),
  cancel: (id) => api.post(`/missions/${id}/cancel_mission/`).then((r) => r.data),
  updateCosts: (id, data) =>
    api.patch(`/missions/${id}/update_costs/`, data).then((r) => r.data),
  updateReports: (id, data) =>
    api.patch(`/missions/${id}/update_reports/`, data).then((r) => r.data),
};

export const searchService = {
  search: (q) => api.get('/search/', { params: { q } }).then((r) => r.data),
};

export const currencyService = {
  list: () => api.get('/currencies/').then((r) => r.data),
};

export const groupService = {
  list: () => api.get('/groups/').then((r) => r.data),
  create: (data) => api.post('/groups/', data).then((r) => r.data),
  update: (id, data) => api.patch(`/groups/${id}/`, data).then((r) => r.data),
  remove: (id) => api.delete(`/groups/${id}/`).then((r) => r.data),
  addMember: (id, userId) => api.post(`/groups/${id}/add_member/`, { user_id: userId }).then((r) => r.data),
  removeMember: (id, userId) => api.delete(`/groups/${id}/remove_member/`, { data: { user_id: userId } }).then((r) => r.data),
};