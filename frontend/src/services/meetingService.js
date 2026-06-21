import { useAuth } from '../context/AuthContext';

export const useMeetingService = () => {
  const { axiosInstance } = useAuth();

  const getMeetings = async (params = {}) => {
    try {
      const response = await axiosInstance.get('/meetings/', { params });
      return response.data;
    } catch (error) {
      console.error('Error loading meetings:', error);
      throw error;
    }
  };

  const getMeeting = async (id) => {
    try {
      const response = await axiosInstance.get(`/meetings/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error loading meeting:', error);
      throw error;
    }
  };

  const createMeeting = async (meetingData) => {
    try {
      const formData = new FormData();
      Object.entries(meetingData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      const response = await axiosInstance.post('/meetings/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  };

  const updateMeeting = async (id, meetingData) => {
    try {
      const response = await axiosInstance.patch(`/meetings/${id}/`, meetingData);
      return response.data;
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  };

  const deleteMeeting = async (id) => {
    try {
      await axiosInstance.delete(`/meetings/${id}/`);
      return true;
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  };

  const processMeeting = async (id) => {
    try {
      const response = await axiosInstance.post(`/meetings/${id}/process/`);
      return response.data;
    } catch (error) {
      console.error('Error processing meeting:', error);
      throw error;
    }
  };

  const transcribeMeeting = async (id) => {
    try {
      const response = await axiosInstance.post(`/meetings/${id}/transcribe/`);
      return response.data;
    } catch (error) {
      console.error('Error transcribing meeting:', error);
      throw error;
    }
  };

  const addParticipant = async (meetingId, userId, role = 'attendee') => {
    try {
      const response = await axiosInstance.post(
        `/meetings/${meetingId}/add_participant/`,
        { user_id: userId, role }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  };

  const removeParticipant = async (meetingId, userId) => {
    try {
      const response = await axiosInstance.delete(
        `/meetings/${meetingId}/remove_participant/`,
        { data: { user_id: userId } }
      );
      return response.data;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  };

  const convertActionItem = async (meetingId, itemId, projectId) => {
    try {
      const response = await axiosInstance.post(
        `/meetings/${meetingId}/action-items/${itemId}/convert/`,
        { project_id: projectId }
      );
      return response.data;
    } catch (error) {
      console.error('Error converting action item:', error);
      throw error;
    }
  };

  const shareToSlack = async (meetingId, channelId) => {
    try {
      const response = await axiosInstance.post(
        `/meetings/${meetingId}/share/slack/`,
        { channel_id: channelId }
      );
      return response.data;
    } catch (error) {
      console.error('Error sharing to Slack:', error);
      throw error;
    }
  };

  const syncCalendar = async (meetingId) => {
    try {
      const response = await axiosInstance.post(
        `/meetings/${meetingId}/sync/calendar/`
      );
      return response.data;
    } catch (error) {
      console.error('Error syncing calendar:', error);
      throw error;
    }
  };

  return {
    getMeetings,
    getMeeting,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    processMeeting,
    transcribeMeeting,
    addParticipant,
    removeParticipant,
    convertActionItem,
    shareToSlack,
    syncCalendar,
  };
};
