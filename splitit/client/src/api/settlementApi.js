import api from './axiosInstance.js';

export const settlementApi = {
  getSettlements:   (groupId, friendId) => {
    const params = groupId ? `groupId=${groupId}` : `friendId=${friendId}`;
    return api.get(`/settlements?${params}`);
  },
  createSettlement: (data) => api.post('/settlements', data),
  deleteSettlement: (id)   => api.delete(`/settlements/${id}`),
};
