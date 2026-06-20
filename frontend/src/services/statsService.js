import { useAuth } from '../context/AuthContext';

export const useStatsService = () => {
  const { axiosInstance } = useAuth();

  const getDashboardStats = async () => {
    try {
      const response = await axiosInstance.get('/tasks/dashboard/');
      return response.data;
    } catch (error) {
      console.error('Erreur chargement stats dashboard:', error);
      throw error;
    }
  };

  const getProjectStats = async (projectId) => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/stats/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement stats projet:', error);
      throw error;
    }
  };

  const getUserStats = async (userId) => {
    try {
      const response = await axiosInstance.get(`/users/${userId}/stats/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement stats utilisateur:', error);
      throw error;
    }
  };

  return {
    getDashboardStats,
    getProjectStats,
    getUserStats,
  };
};
