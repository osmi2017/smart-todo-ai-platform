import { useAuth } from '../context/AuthContext';

/**
 * Factory hook that generates standard CRUD operations for a given resource.
 *
 * Usage:
 *   const taskService = useCrudService('/tasks');
 *   // taskService.getAll(params), .getOne(id), .create(data), .update(id, data), .remove(id)
 *
 * Options:
 *   - resourceName: human-readable name for error messages (defaults to endpoint)
 *   - fallback: value returned on error for getAll/getOne instead of throwing
 *   - formatData: function to transform data before create/update
 *   - extraActions: function(axiosInstance) returning additional methods
 */
export const useCrudService = (endpoint, options = {}) => {
  const { axiosInstance } = useAuth();
  const {
    resourceName = endpoint,
    fallback,
    formatData,
    extraActions,
  } = options;

  const getAll = async (params = {}) => {
    try {
      const response = await axiosInstance.get(`${endpoint}/`, { params });
      return response.data;
    } catch (error) {
      console.error(`Erreur chargement ${resourceName}:`, error);
      if (fallback !== undefined) return typeof fallback === 'function' ? fallback() : fallback;
      throw error;
    }
  };

  const getOne = async (id) => {
    try {
      const response = await axiosInstance.get(`${endpoint}/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Erreur chargement ${resourceName} ${id}:`, error);
      if (fallback !== undefined) return null;
      throw error;
    }
  };

  const create = async (data) => {
    try {
      const payload = formatData ? formatData(data) : data;
      const response = await axiosInstance.post(`${endpoint}/`, payload);
      return response.data;
    } catch (error) {
      console.error(`Erreur création ${resourceName}:`, error.response?.data || error);
      throw error;
    }
  };

  const update = async (id, data) => {
    try {
      const payload = formatData ? formatData(data) : data;
      const response = await axiosInstance.put(`${endpoint}/${id}/`, payload);
      return response.data;
    } catch (error) {
      console.error(`Erreur mise à jour ${resourceName}:`, error.response?.data || error);
      throw error;
    }
  };

  const patch = async (id, data) => {
    try {
      const response = await axiosInstance.patch(`${endpoint}/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Erreur mise à jour partielle ${resourceName}:`, error.response?.data || error);
      throw error;
    }
  };

  const remove = async (id) => {
    try {
      await axiosInstance.delete(`${endpoint}/${id}/`);
      return true;
    } catch (error) {
      console.error(`Erreur suppression ${resourceName}:`, error);
      throw error;
    }
  };

  const base = { getAll, getOne, create, update, patch, remove };
  const extras = extraActions ? extraActions(axiosInstance) : {};

  return { ...base, ...extras };
};
