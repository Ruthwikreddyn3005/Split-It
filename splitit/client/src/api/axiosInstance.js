import axios from 'axios';

// In-memory token store (survives re-renders, lost on page refresh — restored via refreshToken in localStorage)
let accessToken = null;

export function setAccessToken(token) { accessToken = token; }
export function getAccessToken() { return accessToken; }

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const redirectToLogin = () => {
      accessToken = null;
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    if (original.url === '/auth/refresh') {
      isRefreshing = false;
      processQueue(error);
      redirectToLogin();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(original))
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const storedRefresh = localStorage.getItem('refreshToken');
        const res = await api.post('/auth/refresh', storedRefresh ? { refreshToken: storedRefresh } : {});
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        accessToken = newAccess;
        if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
        processQueue(null);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        redirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
