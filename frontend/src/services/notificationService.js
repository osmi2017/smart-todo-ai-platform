import { useCrudService } from '../utils/createCrudService';

export const useNotificationService = () => {
  const service = useCrudService('/notifications', {
    resourceName: 'notifications',
    fallback: [],
    extraActions: (axiosInstance) => ({
      markAsRead: async (id) => {
        try {
          const response = await axiosInstance.post(`/notifications/${id}/read/`);
          return response.data;
        } catch (error) {
          console.error('Erreur marquage lu:', error);
        }
      },
      markAllAsRead: async () => {
        try {
          const response = await axiosInstance.post('/notifications/mark-all-read/');
          return response.data;
        } catch (error) {
          console.error('Erreur marquage tous lus:', error);
        }
      },
      getUnreadCount: async () => {
        try {
          const response = await axiosInstance.get('/notifications/unread-count/');
          return response.data.count;
        } catch (error) {
          console.error('Erreur comptage:', error);
          return 0;
        }
      },
    }),
  });

  return {
    getNotifications: service.getAll,
    markAsRead: service.markAsRead,
    markAllAsRead: service.markAllAsRead,
    getUnreadCount: service.getUnreadCount,
  };
};
