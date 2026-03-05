import api from './axiosInstance.js';

export const expenseApi = {
  getExpenses: (groupId, friendId) => {
    const params = groupId ? `groupId=${groupId}` : `friendId=${friendId}`;
    return api.get(`/expenses?${params}`);
  },
  getActivity: (groupId, friendId) => {
    const params = groupId ? `groupId=${groupId}` : `friendId=${friendId}`;
    return api.get(`/expenses/activity?${params}`);
  },
  createExpense: (data)     => api.post('/expenses', data),
  getExpense:    (id)       => api.get(`/expenses/${id}`),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id)       => api.delete(`/expenses/${id}`),
};
