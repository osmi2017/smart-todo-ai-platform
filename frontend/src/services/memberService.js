import { useAuth } from '../context/AuthContext';

export const useMemberService = () => {
  const { axiosInstance } = useAuth();

  const getProjectMembers = async (projectId) => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/members/`);
      return response.data;
    } catch (error) {
      console.error('Erreur chargement membres:', error);
      throw error;
    }
  };

  const addMember = async (projectId, userData) => {
    try {
      const response = await axiosInstance.post(`/projects/${projectId}/add_member/`, userData);
      return response.data;
    } catch (error) {
      console.error('Erreur ajout membre:', error.response?.data);
      throw error;
    }
  };

  const removeMember = async (projectId, userId) => {
    try {
      const response = await axiosInstance.delete(`/projects/${projectId}/remove_member/`, {
        data: { user_id: userId },
      });
      return response.data;
    } catch (error) {
      console.error('Erreur suppression membre:', error.response?.data);
      throw error;
    }
  };

  const searchAvailableUsers = async (projectId, searchTerm) => {
    try {
      const response = await axiosInstance.get(`/projects/${projectId}/available_users/`, {
        params: { search: searchTerm },
      });
      return response.data;
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      throw error;
    }
  };

  return {
    getProjectMembers,
    addMember,
    removeMember,
    searchAvailableUsers,
  };
};
