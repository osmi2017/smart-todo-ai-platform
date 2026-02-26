import { useAuth } from '../context/AuthContext';

export const useProjectService = () => {
  const { axiosInstance } = useAuth();

  const getProjects = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/projects/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      throw error;
    }
  };

  const getProject = async (id) => {
    try {
      const response = await axiosInstance.get(`/projects/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
      throw error;
    }
  };

  const createProject = async (projectData) => {
    try {
      const response = await axiosInstance.post('/projects/', projectData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      throw error;
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      const response = await axiosInstance.put(`/projects/${id}/`, projectData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du projet:', error);
      throw error;
    }
  };

  const deleteProject = async (id) => {
    try {
      await axiosInstance.delete(`/projects/${id}/`);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      throw error;
    }
  };

  const getProjectStats = async (id) => {
    try {
      const response = await axiosInstance.get(`/projects/${id}/stats/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
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
