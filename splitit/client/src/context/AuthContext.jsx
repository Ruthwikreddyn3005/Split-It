import { createContext, useContext, useState, useEffect } from 'react';
import { userApi } from '../api/userApi.js';
import { authApi } from '../api/authApi.js';
import { setAccessToken } from '../api/axiosInstance.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (storedRefresh) {
      authApi.refresh({ refreshToken: storedRefresh })
        .then((res) => {
          const { accessToken, refreshToken } = res.data.data;
          setAccessToken(accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          return userApi.getMe();
        })
        .then((res) => setUser(res.data.data.user))
        .catch(() => {
          setAccessToken(null);
          localStorage.removeItem('refreshToken');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { user, accessToken, refreshToken } = res.data.data;
    setAccessToken(accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    return user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    await authApi.logout({ refreshToken }).catch(() => {});
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const updateUser = (updates) => setUser((u) => ({ ...u, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
