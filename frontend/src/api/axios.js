// src/api/axios.js
import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const backendOrigin = configuredApiUrl
  ?.replace(/\/api\/?$/i, '')
  .replace(/[/.]+$/, '');
const apiBaseUrl = backendOrigin
  ? `${backendOrigin}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
});

// Response interceptor — handle token expiry globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear and redirect
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
