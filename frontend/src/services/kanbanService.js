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
      return getMockKanbanData();
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

// Données mockées pour le développement
const getMockKanbanData = () => {
  return [
    {
      id: 1,
      title: "Finaliser le dashboard Recharts",
      description: "Ajouter les graphiques d'activité et de progression",
      priority: 3,
      status: "todo",
      project_id: 1,
      project_name: "Frontend",
      assigned_to_name: "Jean",
      tags: ["dashboard", "graphiques"],
      deadline: "2026-03-01",
      estimated_time: 4,
      comments_count: 2
    },
    {
      id: 2,
      title: "Implémenter l'authentification JWT",
      description: "Mettre en place les tokens et la gestion des sessions",
      priority: 4,
      status: "in_progress",
      project_id: 2,
      project_name: "Backend",
      assigned_to_name: "Marie",
      tags: ["auth", "security"],
      deadline: "2026-02-28",
      estimated_time: 6,
      comments_count: 1
    },
    {
      id: 3,
      title: "Créer les modèles ML",
      description: "Développer les modèles de prédiction avec TensorFlow",
      priority: 3,
      status: "in_progress",
      project_id: 3,
      project_name: "ML Service",
      assigned_to_name: "Pierre",
      tags: ["ML", "TensorFlow"],
      deadline: "2026-03-05",
      estimated_time: 8,
      comments_count: 0
    },
    {
      id: 4,
      title: "Tester l'API REST",
      description: "Écrire des tests unitaires pour tous les endpoints",
      priority: 2,
      status: "review",
      project_id: 2,
      project_name: "Backend",
      assigned_to_name: "Sophie",
      tags: ["tests", "API"],
      deadline: "2026-02-27",
      estimated_time: 3,
      comments_count: 3
    },
    {
      id: 5,
      title: "Corriger les bugs CORS",
      description: "Résoudre les problèmes de CORS en production",
      priority: 4,
      status: "blocked",
      project_id: 2,
      project_name: "Backend",
      assigned_to_name: "Thomas",
      tags: ["bug", "cors"],
      deadline: "2026-02-26",
      estimated_time: 2,
      comments_count: 4
    },
    {
      id: 6,
      title: "Optimiser les requêtes DB",
      description: "Ajouter des indexes et optimiser les requêtes N+1",
      priority: 2,
      status: "todo",
      project_id: 2,
      project_name: "Backend",
      assigned_to_name: "Julie",
      tags: ["performance", "DB"],
      deadline: "2026-03-03",
      estimated_time: 5,
      comments_count: 1
    },
    {
      id: 7,
      title: "Design system Chakra UI",
      description: "Créer des composants réutilisables",
      priority: 2,
      status: "completed",
      project_id: 1,
      project_name: "Frontend",
      assigned_to_name: "Jean",
      tags: ["UI", "design"],
      deadline: "2026-02-25",
      estimated_time: 10,
      actual_time: 12,
      comments_count: 5
    }
  ];
};
