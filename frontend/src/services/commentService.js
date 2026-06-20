import { useAuth } from '../context/AuthContext';

export const useCommentService = () => {
  const { axiosInstance } = useAuth();

  const getTaskComments = async (taskId) => {
    try {
      const response = await axiosInstance.get('/comments/', {
        params: { task: taskId }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
      throw error;
    }
  };

  const addComment = async (taskId, content, parentId = null) => {
    try {
      const data = {
        content,
        task: taskId,
        parent: parentId
      };
      const response = await axiosInstance.post('/comments/', data);
      return response.data;
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
      throw error;
    }
  };

  const updateComment = async (commentId, content) => {
    try {
      const response = await axiosInstance.patch(`/comments/${commentId}/`, {
        content
      });
      return response.data;
    } catch (error) {
      console.error('Erreur modification commentaire:', error);
      throw error;
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await axiosInstance.delete(`/comments/${commentId}/`);
      return true;
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      throw error;
    }
  };

  const replyToComment = async (parentId, content) => {
    try {
      const response = await axiosInstance.post(`/comments/${parentId}/reply/`, {
        content
      });
      return response.data;
    } catch (error) {
      console.error('Erreur réponse commentaire:', error);
      throw error;
    }
  };

  return {
    getTaskComments,
    addComment,
    updateComment,
    deleteComment,
    replyToComment,
  };
};
