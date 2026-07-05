import { useCrudService } from '../utils/createCrudService';

const getMockProjects = () => [
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

const formatProjectData = (data) => {
  const formatted = {
    name: data.name,
    description: data.description || '',
    status: data.status || 'not_started',
    start_date: data.start_date || null,
    deadline: data.deadline || null,
  };
  if (data.groups !== undefined) formatted.groups = data.groups;
  if (data.managers !== undefined) formatted.managers = data.managers;
  if (data.members !== undefined) formatted.members = data.members;
  return formatted;
};

export const useProjectService = () => {
  const service = useCrudService('/projects', {
    resourceName: 'projets',
    fallback: getMockProjects,
    formatData: formatProjectData,
    extraActions: (axiosInstance) => ({
      getProjectStats: async (id) => {
        try {
          const response = await axiosInstance.get(`/projects/${id}/stats/`);
          return response.data;
        } catch (error) {
          console.error('Erreur chargement stats:', error);
          return null;
        }
      },
    }),
  });

  return {
    getProjects: service.getAll,
    getProject: service.getOne,
    createProject: service.create,
    updateProject: service.update,
    deleteProject: service.remove,
    getProjectStats: service.getProjectStats,
  };
};
