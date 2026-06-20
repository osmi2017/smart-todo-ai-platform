import { useAuth } from '../context/AuthContext';

export const useMilestoneService = () => {
  const { axiosInstance } = useAuth();

  /**
   * Récupère la liste des jalons (avec filtres optionnels)
   * @param {Object} params - { project, status, search }
   * @returns {Promise<Array>}
   */
  const getMilestones = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/milestones/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur chargement milestones:', error);
      // On propage l'erreur pour que l'appelant puisse la gérer
      throw error;
    }
  };

  /**
   * Récupère un jalon spécifique par son ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  const getMilestone = async (id) => {
    try {
      const response = await axiosInstance.get(`/milestones/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement milestone:', error);
      throw error;
    }
  };

  /**
   * Crée un nouveau jalon
   * @param {Object} milestoneData - { name, description, due_date, project_id }
   * @returns {Promise<Object>}
   */
  const createMilestone = async (milestoneData) => {
    try {
      // Le backend attend un champ 'project' (l'ID du projet)
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

  /**
   * Met à jour un jalon existant
   * @param {number} id
   * @param {Object} milestoneData - { name, description, due_date, project_id, status }
   * @returns {Promise<Object>}
   */
  const updateMilestone = async (id, milestoneData) => {
    try {
      const formattedData = {
        name: milestoneData.name,
        description: milestoneData.description,
        due_date: milestoneData.due_date,
        project: milestoneData.project_id,
        status: milestoneData.status,
        progress: milestoneData.progress,
      };
      const response = await axiosInstance.put(`/milestones/${id}/`, formattedData);
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour milestone:', error);
      throw error;
    }
  };

  /**
   * Supprime un jalon
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  const deleteMilestone = async (id) => {
    try {
      await axiosInstance.delete(`/milestones/${id}/`);
      return true;
    } catch (error) {
      console.error('Erreur suppression milestone:', error);
      throw error;
    }
  };

  /**
   * Calcule le score de risque d'un jalon via l'IA
   * @param {number} id
   * @returns {Promise<Object>} - { risk_score: number }
   */
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
