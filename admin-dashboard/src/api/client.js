import axios from 'axios';

// Production backend URL.
// Vercel will use VITE_API_URL when building the application.
const API_URL =
  import.meta.env.VITE_API_URL || 'https://rkpeedika.onrender.com/api';

// Helper to check if a JWT is expired
function isTokenExpired(token) {
  if (!token) return true;

  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1]));

    if (!payload.exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    // 10-second safety buffer
    return payload.exp < now + 10;
  } catch {
    return true;
  }
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshTokenPromise = null;

async function getValidToken() {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return null;
  }

  const cleanToken = token.startsWith('Bearer ')
    ? token.substring(7)
    : token;

  // Existing token is still valid
  if (!isTokenExpired(cleanToken)) {
    return token;
  }

  // Token expired — try refresh token
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  // Prevent multiple simultaneous refresh requests
  if (!refreshTokenPromise) {
    refreshTokenPromise = axios
      .post(`${API_URL}/auth/refresh`, {
        refreshToken,
      })
      .then((res) => {
        const data = res.data;

        if (!data.success || !data.token) {
          throw new Error('Invalid refresh response');
        }

        localStorage.setItem('accessToken', data.token);

        if (data.refreshToken) {
          localStorage.setItem(
            'refreshToken',
            data.refreshToken
          );
        }

        window.dispatchEvent(
          new CustomEvent('auth-token-refreshed', {
            detail: {
              token: data.token,
            },
          })
        );

        return data.token;
      })
      .catch((error) => {
        clearAuthSession();
        throw error;
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

  window.dispatchEvent(new Event('auth-logout'));

  window.dispatchEvent(
    new CustomEvent('show-toast', {
      detail: {
        message: 'Your session has expired. Please sign in again.',
        type: 'warning',
      },
    })
  );

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const url = config.url || '';

    // These endpoints do not require an access token
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/register')
    ) {
      return config;
    }

    try {
      const token = await getValidToken();

      if (token) {
        config.headers = config.headers || {};

        config.headers.Authorization = token.startsWith('Bearer ')
          ? token
          : `Bearer ${token}`;
      }
    } catch {
      // Let the server handle authentication failure
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthRequest =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh');

    if (
      error.response &&
      (error.response.status === 401 ||
        error.response.status === 403) &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        const token = await getValidToken();

        if (token) {
          originalRequest.headers =
            originalRequest.headers || {};

          originalRequest.headers.Authorization =
            token.startsWith('Bearer ')
              ? token
              : `Bearer ${token}`;

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