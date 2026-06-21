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
      console.log('📦 Service - Données reçues:', milestoneData); // LOG
      
      // S'assurer que project est un nombre
      const formattedData = {
        name: milestoneData.name,
        description: milestoneData.description || '',
        due_date: milestoneData.due_date,
        project: parseInt(milestoneData.project, 10),  // ← Utiliser 'project' pas 'project_id'
        status: milestoneData.status || 'not_started',
        progress: parseFloat(milestoneData.progress) || 0,
      };

      console.log('📤 Service - Données envoyées:', formattedData); // LOG
      
      const response = await axiosInstance.post('/milestones/', formattedData);
      return response.data;
    } catch (error) {
      console.error('Erreur création milestone:', error.response?.data);
      throw error;
    }
  };

  const updateMilestone = async (id, milestoneData) => {
    try {
      console.log('📦 Service - Update données reçues:', milestoneData);
      
      const formattedData = {
        name: milestoneData.name,
        description: milestoneData.description || '',
        due_date: milestoneData.due_date,
        project: parseInt(milestoneData.project, 10),
        status: milestoneData.status || 'not_started',
        progress: parseFloat(milestoneData.progress) || 0,
      };
      
      console.log('📤 Service - Update données envoyées:', formattedData);
      
      const response = await axiosInstance.patch(`/milestones/${id}/`, formattedData);  // ← PATCH au lieu de PUT
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour milestone:', error.response?.data);
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
