import axios from 'axios';

// Helper to check if a JWT is expired
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    // Buffer of 10 seconds before actual expiry
    return payload.exp < (now + 10);
  } catch (e) {
    return true;
  }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshTokenPromise = null;

async function getValidToken() {
  let token = localStorage.getItem('accessToken');
  if (!token) return null;

  const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
  if (!isTokenExpired(cleanToken)) {
    return token;
  }

  // Token is expired! Let's silently refresh
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  if (!refreshTokenPromise) {
    const backendUrl = import.meta.env.VITE_API_URL || '/api';
    refreshTokenPromise = axios.post(`${backendUrl}/auth/refresh`, { refreshToken })
      .then(res => {
        const data = res.data;
        if (data.success && data.token) {
          localStorage.setItem('accessToken', data.token);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          window.dispatchEvent(new CustomEvent('auth-token-refreshed', { detail: { token: data.token } }));
          return data.token;
        }
        throw new Error('Invalid refresh response');
      })
      .catch(err => {
        clearAuthSession();
        throw err;
      })
      .finally(() => {
        refreshTokenPromise = null;
      });
  }

  return refreshTokenPromise;
}

function clearAuthSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // Dispatch custom events so the app knows to clean up state immediately
  window.dispatchEvent(new Event('auth-logout'));
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { message: 'Your session has expired. Please sign in again.', type: 'warning' }
  }));
}

// Request interceptor attaches credentials and auto-refreshes before requests
apiClient.interceptors.request.use(
  async (config) => {
    if (config.url.includes('/auth/login') || config.url.includes('/auth/refresh') || config.url.includes('/auth/register')) {
      return config;
    }
    
    try {
      const token = await getValidToken();
      if (token) {
        config.headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
    } catch (err) {
      // Suppress and let request handle 401/403
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor handles unexpected 401/403 errors by retrying once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const token = await getValidToken();
        if (token) {
          originalRequest.headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
