import { useAuth } from '../context/AuthContext';
import { useCrudService } from '../utils/createCrudService';

export const useStatsService = () => {
  const { axiosInstance } = useAuth();
  const projectService = useCrudService('/projects', { resourceName: 'stats projet' });
  const userService = useCrudService('/users', { resourceName: 'stats utilisateur' });

  const getDashboardStats = async () => {
    const response = await axiosInstance.get('/tasks/dashboard/');
    return response.data;
  };

  const getAnalyticsStats = async (timeRange = 'week') => {
    const response = await axiosInstance.get('/tasks/analytics/', {
      params: { range: timeRange },
    });
    return response.data;
  };

  const getProjectStats = async (projectId) => {
    try {
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
    getAnalyticsStats,
    getProjectStats,
    getUserStats,
  };
};
