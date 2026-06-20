import { useAuth } from '../context/AuthContext';

export const useNotificationService = () => {
  const { axiosInstance } = useAuth();

  const getNotifications = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/notifications/', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      throw error;
    }
  };

  const markAsRead = async (id) => {
    try {
      const response = await axiosInstance.post(`/notifications/${id}/read/`);
      return response.data;
    } catch (error) {
      console.error('Erreur marquage lu:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await axiosInstance.post('/notifications/mark-all-read/');
      return response.data;
    } catch (error) {
      console.error('Erreur marquage tous lus:', error);
      throw error;
    }
  };

  const getUnreadCount = async () => {
    try {
      const response = await axiosInstance.get('/notifications/unread-count/');
      return response.data.count;
    } catch (error) {
      console.error('Erreur comptage:', error);
      throw error;
    }
  };

  return {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
  };
};
