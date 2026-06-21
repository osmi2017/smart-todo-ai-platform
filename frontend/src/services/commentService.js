import { useCrudService } from '../utils/createCrudService';

export const useCommentService = () => {
  const service = useCrudService('/comments', {
    resourceName: 'commentaires',
    extraActions: (axiosInstance) => ({
      getTaskComments: async (taskId) => {
        try {
          const response = await axiosInstance.get('/comments/', {
            params: { task: taskId },
          });
          return response.data;
        } catch (error) {
          console.error('Erreur chargement commentaires:', error);
          return [];
        }
      },
      addComment: async (taskId, content, parentId = null) => {
        try {
          const data = { content, task: taskId, parent: parentId };
          const response = await axiosInstance.post('/comments/', data);
          return response.data;
        } catch (error) {
          console.error('Erreur ajout commentaire:', error);
          throw error;
        }
      },
      replyToComment: async (parentId, content) => {
        try {
          const response = await axiosInstance.post(`/comments/${parentId}/reply/`, {
            content,
          });
          return response.data;
        } catch (error) {
          console.error('Erreur réponse commentaire:', error);
          throw error;
        }
      },
    }),
  });

  return {
    getTaskComments: service.getTaskComments,
    addComment: service.addComment,
    updateComment: (commentId, content) => service.patch(commentId, { content }),
    deleteComment: service.remove,
    replyToComment: service.replyToComment,
  };
};
