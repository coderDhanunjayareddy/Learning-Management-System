// frontend/src/services/api.ts
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
});

const authClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
});

const notifyAuthChange = (token: string | null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('auth-token', { detail: token }));
};

const applyToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
  notifyAuthChange(token);
};

const clearToken = () => {
  localStorage.removeItem('token');
  applyToken(null);
};

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
  try {
    const res = await authClient.post('/auth/refresh');
    const newToken = res.data?.token || null;
    if (newToken) {
      localStorage.setItem('token', newToken);
      applyToken(newToken);
    } else {
      clearToken();
    }
    return newToken;
  } catch (err) {
    clearToken();
    return null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export { applyToken };
export default api;
