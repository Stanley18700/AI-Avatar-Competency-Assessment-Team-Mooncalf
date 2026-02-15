import axios from 'axios';

const DIRECT_RENDER_API_URL = 'https://nursemind-ai-api.onrender.com/api';

const resolvedBaseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? DIRECT_RENDER_API_URL : '/api');

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as any;

    if (
      error.response?.status === 502 &&
      originalRequest &&
      !originalRequest.__retryWithDirectRender
    ) {
      originalRequest.__retryWithDirectRender = true;
      originalRequest.baseURL = DIRECT_RENDER_API_URL;
      return api.request(originalRequest);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
