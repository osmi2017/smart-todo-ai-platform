// src/services/projectService.js
import { useAuth } from '../context/AuthContext';

export const useProjectService = () => {
  const { axiosInstance } = useAuth();

  const getProjects = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/projects/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur chargement projets:', error);
      return getMockProjects();
    }
  };

  const getProject = async (id) => {
    try {
      const response = await axiosInstance.get(`/projects/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement projet:', error);
      return null;
    }
  };

  const createProject = async (projectData) => {
    try {
      // S'assurer que les dates sont au bon format
      const formattedData = {
        name: projectData.name,
        description: projectData.description || '',
        status: projectData.status || 'not_started',
        start_date: projectData.start_date || null,
        deadline: projectData.deadline || null,
      };
      
      console.log('Données envoyées:', formattedData); // LOG
      
      const response = await axiosInstance.post('/projects/', formattedData);
      console.log('Réponse:', response.data); // LOG
      return response.data;
    } catch (error) {
      console.error('Erreur détaillée:', error.response?.data); // LOG important
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
      throw error;
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      const formattedData = {
        name: projectData.name,
        description: projectData.description || '',
        status: projectData.status,
        start_date: projectData.start_date || null,
        deadline: projectData.deadline || null,
      };
      
      const response = await axiosInstance.put(`/projects/${id}/`, formattedData);
      return response.data;
    } catch (error) {
      console.error('Erreur mise à jour projet:', error.response?.data);
      throw error;
    }
  };

  const deleteProject = async (id) => {
    try {
      await axiosInstance.delete(`/projects/${id}/`);
      return true;
    } catch (error) {
      console.error('Erreur suppression projet:', error);
      throw error;
    }
  };

  const getProjectStats = async (id) => {
    try {
      const response = await axiosInstance.get(`/projects/${id}/stats/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      return null;
    }
  };

  return {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectStats,
  };
};

// Données mockées
const getMockProjects = () => {
  return [
    {
      id: 1,
      name: "Frontend Development",
      description: "Développement de l'interface utilisateur avec React",
      status: "in_progress",
      progress: 65,
      start_date: "2026-02-01",
      deadline: "2026-03-15",
      owner: 1,
      owner_name: "admin",
      members_count: 3,
      task_count: 12,
      completed_task_count: 8,
    },
    {
      id: 2,
      name: "Backend API",
      description: "Développement de l'API REST avec Django",
      status: "in_progress",
      progress: 45,
      start_date: "2026-02-05",
      deadline: "2026-03-20",
      owner: 1,
      owner_name: "admin",
      members_count: 2,
      task_count: 10,
      completed_task_count: 4,
    },
  ];
};
