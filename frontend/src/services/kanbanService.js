import { useAuth } from '../context/AuthContext';

export const useKanbanService = () => {
  const { axiosInstance } = useAuth();

  const getKanbanTasks = async (projectId = null) => {
    try {
      const params = projectId ? { project: projectId } : {};
      const response = await axiosInstance.get('/tasks/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur chargement tâches Kanban:', error);
      throw error;
    }
  };

  const updateTaskStatus = async (taskId, newStatus, newOrder = 0) => {
    try {
      const response = await axiosInstance.patch(`/tasks/${taskId}/`, {
        status: newStatus,
        order: newOrder
      });
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      throw error;
    }
  };

  const updateTaskOrder = async (taskId, newOrder) => {
    try {
      const response = await axiosInstance.patch(`/tasks/${taskId}/`, {
        order: newOrder
      });
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour ordre:', error);
      throw error;
    }
  };

  return {
    getKanbanTasks,
    updateTaskStatus,
    updateTaskOrder,
  };
};
