import { useCrudService } from '../utils/createCrudService';

export const useTaskService = () => {
  const service = useCrudService('/tasks', {
    resourceName: 'tâches',
    extraActions: (axiosInstance) => ({
      predictTask: async (id) => {
        try {
          const response = await axiosInstance.post(`/tasks/${id}/predict/`);
          return response.data;
        } catch (error) {
          console.error('Erreur lors de la prédiction:', error);
          throw error;
        }
      },
      getDashboardStats: async () => {
        try {
          const response = await axiosInstance.get('/tasks/dashboard/');
          return response.data;
        } catch (error) {
          console.error('Erreur lors du chargement du dashboard:', error);
          throw error;
        }
      },
    }),
  });

  return {
    getTasks: service.getAll,
    getTask: service.getOne,
    createTask: service.create,
    updateTask: service.update,      // PUT (remplacement complet)
    patchTask: service.patch,        // PATCH (mise à jour partielle) ← AJOUT
    deleteTask: service.remove,
    predictTask: service.predictTask,
    getDashboardStats: service.getDashboardStats,
  };
};
