import { useCrudService } from '../utils/createCrudService';

export const useMilestoneService = () => {
  const service = useCrudService('/milestones', {
    resourceName: 'jalons',
    extraActions: (axiosInstance) => ({
      predictRisk: async (id) => {
        try {
          const response = await axiosInstance.post(`/milestones/${id}/predict_risk/`);
          return response.data;
        } catch (error) {
          console.error('Erreur prédiction risque:', error);
          throw error;
        }
      },
    }),
  });

  return {
    getMilestones: service.getAll,
    getMilestone: service.getOne,
    createMilestone: service.create,
    updateMilestone: service.update,
    deleteMilestone: service.remove,
    predictRisk: service.predictRisk,
  };
};
