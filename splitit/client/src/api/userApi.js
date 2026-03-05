import api from './axiosInstance.js';

export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/me/password', data),
  updateTheme: (theme) => api.put('/users/me/theme', { theme }),
  searchUsers: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
};
