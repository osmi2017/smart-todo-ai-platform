import { useCrudService } from '../utils/createCrudService';

export const useMissionService = () => {
  const service = useCrudService('/missions', {
    resourceName: 'missions',
    formatData: (data) => {
      const formatted = {
        title: data.title,
        description: data.description || '',
        status: data.status || 'planned',
        destination_name: data.destination_name || '',
        destination_lat: data.destination_lat || null,
        destination_lng: data.destination_lng || null,
        distance_km: data.distance_km || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        cost_per_diem: data.cost_per_diem || 0,
        cost_accommodation: data.cost_accommodation || 0,
        cost_transport: data.cost_transport || 0,
        cost_other: data.cost_other || 0,
        currency: data.currency || 'xof',
        expense_report: data.expense_report || '',
        mission_report: data.mission_report || '',
        project: data.project || null,
        tasks: data.tasks || [],
        milestones: data.milestones || [],
      };
      if (data.member_ids !== undefined) formatted.member_ids = data.member_ids;
      if (data.leader_id !== undefined) formatted.leader_id = data.leader_id;
      return formatted;
    },
    extraActions: (axiosInstance) => ({
      endMission: async (id) => {
        const response = await axiosInstance.post(`/missions/${id}/end_mission/`);
        return response.data;
      },
      startMission: async (id) => {
        const response = await axiosInstance.post(`/missions/${id}/start_mission/`);
        return response.data;
      },
      cancelMission: async (id) => {
        const response = await axiosInstance.post(`/missions/${id}/cancel_mission/`);
        return response.data;
      },
      updateCosts: async (id, data) => {
        const response = await axiosInstance.patch(`/missions/${id}/update_costs/`, data);
        return response.data;
      },
      updateReports: async (id, data) => {
        const response = await axiosInstance.patch(`/missions/${id}/update_reports/`, data);
        return response.data;
      },
    }),
  });

  return {
    getMissions: service.getAll,
    getMission: service.getOne,
    createMission: service.create,
    updateMission: service.update,
    deleteMission: service.remove,
    endMission: service.endMission,
    startMission: service.startMission,
    cancelMission: service.cancelMission,
    updateCosts: service.updateCosts,
    updateReports: service.updateReports,
  };
};
