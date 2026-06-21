import { useAuth } from '../context/AuthContext';

export const useMilestoneService = () => {
  const { axiosInstance } = useAuth();

  const getMilestones = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/milestones/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur chargement milestones:', error);
      throw error;
    }
  };

  const getMilestone = async (id) => {
    try {
      const response = await axiosInstance.get(`/milestones/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement milestone:', error);
      throw error;
    }
  };

  const createMilestone = async (milestoneData) => {
    try {
      const formattedData = {
        name: milestoneData.name,
        description: milestoneData.description || '',
        due_date: milestoneData.due_date,
        project: milestoneData.project_id,
      };

      const response = await axiosInstance.post('/milestones/', formattedData);
      return response.data;
    } catch (error) {
      console.error('Erreur création milestone:', error.response?.data);
      throw error;
    }
  };

  const updateMilestone = async (id, milestoneData) => {
    try {
      const response = await axiosInstance.put(`/milestones/${id}/`, milestoneData);
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour milestone:', error);
      throw error;
    }
  };

  const deleteMilestone = async (id) => {
    try {
      await axiosInstance.delete(`/milestones/${id}/`);
      return true;
    } catch (error) {
      console.error('Erreur suppression milestone:', error);
      throw error;
    }
  };

  const predictRisk = async (id) => {
    try {
      const response = await axiosInstance.post(`/milestones/${id}/predict_risk/`);
      return response.data;
    } catch (error) {
      console.error('Erreur prédiction risque:', error);
      throw error;
    }
  };

  return {
    getMilestones,
    getMilestone,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    predictRisk,
  };
};
