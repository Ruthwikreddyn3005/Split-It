import api from './axiosInstance.js';

export const groupApi = {
  getGroups: () => api.get('/groups'),
  createGroup: (data) => api.post('/groups', data),
  getGroup: (id) => api.get(`/groups/${id}`),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  archiveGroup: (id) => api.delete(`/groups/${id}`),
  addMember: (id, email) => api.post(`/groups/${id}/members`, { email }),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  getBalances: (id) => api.get(`/groups/${id}/balances`),
};
