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
      throw error;
    }
  };

  const getProject = async (id) => {
    try {
      const response = await axiosInstance.get(`/projects/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement projet:', error);
      throw error;
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
      
      const response = await axiosInstance.post('/projects/', formattedData);
      return response.data;
    } catch (error) {
      console.error('Erreur création projet:', error.response?.data);
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
      throw error;
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

