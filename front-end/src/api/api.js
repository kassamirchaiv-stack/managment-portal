import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
let csrfToken = null;

export const setCsrfToken = (token) => {
  csrfToken = token;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * Attach the in-memory CSRF token to protect cookie-authenticated mutations.
 */
api.interceptors.request.use(
  (config) => {
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * If the session cookie is rejected, clear saved display data and return to sign-in.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request. Clearing saved session data.');
      localStorage.removeItem('user');
      setCsrfToken(null);
      const publicAuthRequest = ['/token', '/api/auth/me', '/api/auth/csrf'].includes(
        error.config?.url
      );

      if (!publicAuthRequest && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;