import api from './axiosInstance.js';

export const auditApi = {
  getLog: (groupId, friendId) => {
    const params = groupId ? `groupId=${groupId}` : `friendId=${friendId}`;
    return api.get(`/audit?${params}`);
  },
};
