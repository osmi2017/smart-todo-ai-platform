import { useAuth } from '../context/AuthContext';

export const useMilestoneService = () => {
  const { axiosInstance } = useAuth();

  const getMilestones = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/milestones/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur chargement milestones:', error);
      return getMockMilestones();
    }
  };

  const getMilestone = async (id) => {
    try {
      const response = await axiosInstance.get(`/milestones/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement milestone:', error);
      return null;
    }
  };

  const createMilestone = async (milestoneData) => {
    try {
      const response = await axiosInstance.post('/milestones/', milestoneData);
      return response.data;
    } catch (error) {
      console.error('Erreur création milestone:', error);
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
      return { risk_score: 0 };
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

// Données mockées
const getMockMilestones = () => {
  return [
    {
      id: 1,
      name: "Phase 1: MVP",
      description: "Développement du produit minimum viable",
      due_date: "2026-03-15",
      status: "in_progress",
      progress: 65,
      risk_score: 25,
      project_id: 1,
      project_name: "Smart Todo AI",
      tasks_count: 12,
      completed_tasks: 8,
    },
    {
      id: 2,
      name: "Intégration ML",
      description: "Mise en place des modèles de prédiction",
      due_date: "2026-03-10",
      status: "in_progress",
      progress: 40,
      risk_score: 45,
      project_id: 1,
      project_name: "Smart Todo AI",
      tasks_count: 8,
      completed_tasks: 3,
    },
    {
      id: 3,
      name: "Tests utilisateurs",
      description: "Phase de test avec les premiers utilisateurs",
      due_date: "2026-03-20",
      status: "not_started",
      progress: 0,
      risk_score: 60,
      project_id: 1,
      project_name: "Smart Todo AI",
      tasks_count: 6,
      completed_tasks: 0,
    },
    {
      id: 4,
      name: "Déploiement production",
      description: "Mise en production de l'application",
      due_date: "2026-03-25",
      status: "not_started",
      progress: 0,
      risk_score: 75,
      project_id: 1,
      project_name: "Smart Todo AI",
      tasks_count: 10,
      completed_tasks: 0,
    },
    {
      id: 5,
      name: "Documentation",
      description: "Rédaction de la documentation technique",
      due_date: "2026-03-05",
      status: "delayed",
      progress: 30,
      risk_score: 85,
      project_id: 2,
      project_name: "Documentation",
      tasks_count: 5,
      completed_tasks: 1,
    },
  ];
};
