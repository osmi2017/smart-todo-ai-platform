import { useAuth } from '../context/AuthContext';

export const useTaskService = () => {
  const { axiosInstance } = useAuth();

  const getTasks = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/tasks/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
      throw error;
    }
  };

  const getTask = async (id) => {
    try {
      const response = await axiosInstance.get(`/tasks/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement de la tâche:', error);
      throw error;
    }
  };

  const createTask = async (taskData) => {
    try {
      const response = await axiosInstance.post('/tasks/', taskData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      throw error;
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      const response = await axiosInstance.put(`/tasks/${id}/`, taskData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
      throw error;
    }
  };

  const deleteTask = async (id) => {
    try {
      await axiosInstance.delete(`/tasks/${id}/`);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
      throw error;
    }
  };

  const predictTask = async (id) => {
    try {
      const response = await axiosInstance.post(`/tasks/${id}/predict/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la prédiction:', error);
      throw error;
    }
  };

  const getDashboardStats = async () => {
    try {
      const response = await axiosInstance.get('/tasks/dashboard/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      throw error;
    }
  };

  return {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    predictTask,
    getDashboardStats,
  };
};
