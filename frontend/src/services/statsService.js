import { useCrudService } from '../utils/createCrudService';

const getMockDashboardData = () => ({
  total_projects: 8,
  active_projects: 5,
  total_tasks: 47,
  completed_tasks: 23,
  in_progress_tasks: 15,
  delayed_tasks: 4,
  tasks_by_priority: { low: 12, medium: 18, high: 12, critical: 5 },
  tasks_by_status: { todo: 15, in_progress: 15, review: 5, blocked: 4, completed: 23 },
  upcoming_deadlines: [
    { id: 1, title: "Finaliser le dashboard", deadline: "2026-03-01", project_name: "Frontend", priority: 3 },
    { id: 2, title: "Intégration API ML", deadline: "2026-03-02", project_name: "Backend", priority: 4 },
    { id: 3, title: "Tests unitaires", deadline: "2026-03-03", project_name: "Backend", priority: 2 },
  ],
  recent_activities: [
    { id: 1, user_name: "Jean", action: "create", entity_type: "task", created_at: "2026-02-26T10:30:00" },
    { id: 2, user_name: "Marie", action: "complete", entity_type: "task", created_at: "2026-02-26T09:15:00" },
  ],
  productivity_score: 78,
  weekly_activity: [
    { day: "Lun", tasks: 8 },
    { day: "Mar", tasks: 12 },
    { day: "Mer", tasks: 10 },
    { day: "Jeu", tasks: 15 },
    { day: "Ven", tasks: 9 },
    { day: "Sam", tasks: 4 },
    { day: "Dim", tasks: 2 },
  ],
  project_progress: [
    { name: "Frontend", progress: 75, color: "#4299E1" },
    { name: "Backend", progress: 60, color: "#48BB78" },
    { name: "ML Service", progress: 45, color: "#ED8936" },
    { name: "Mobile App", progress: 30, color: "#9F7AEA" },
  ],
});

export const useStatsService = () => {
  const taskService = useCrudService('/tasks', { resourceName: 'stats' });
  const projectService = useCrudService('/projects', { resourceName: 'stats projet' });
  const userService = useCrudService('/users', { resourceName: 'stats utilisateur' });

  const getDashboardStats = async () => {
    try {
      const response = await taskService.getAll({ _endpoint: 'dashboard' });
      return response;
    } catch (error) {
      return getMockDashboardData();
    }
  };

  const getProjectStats = async (projectId) => {
    try {
      // Uses the project stats endpoint directly
      return await projectService.getOne(`${projectId}/stats`);
    } catch (error) {
      return null;
    }
  };

  const getUserStats = async (userId) => {
    try {
      return await userService.getOne(`${userId}/stats`);
    } catch (error) {
      return null;
    }
  };

  return {
    getDashboardStats,
    getProjectStats,
    getUserStats,
  };
};
