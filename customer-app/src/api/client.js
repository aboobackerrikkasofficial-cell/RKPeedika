import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://rkpeedika.onrender.com/api';

function isTokenExpired(token) {
  if (!token) return true;

  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(
      atob(parts[1])
    );

    if (!payload.exp) {
      return false;
    }

    const now = Math.floor(
      Date.now() / 1000
    );

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
  timeout: 30000,
});

let refreshTokenPromise = null;

function clearAuthSession() {
  const isGuest = localStorage.getItem('isGuest') === 'true';
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('isGuest');

  window.dispatchEvent(
    new Event('auth-logout')
  );

  if (!isGuest) {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: {
          message:
            'Your session has expired. Please sign in again.',
          type: 'warning',
        },
      })
    );
  }
}

async function getValidToken() {
  const token =
    localStorage.getItem('accessToken');

  if (!token) {
    return null;
  }

  const cleanToken = token.startsWith(
    'Bearer '
  )
    ? token.substring(7)
    : token;

  if (!isTokenExpired(cleanToken)) {
    return token;
  }

  const refreshToken =
    localStorage.getItem('refreshToken');

  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  if (!refreshTokenPromise) {
    refreshTokenPromise = axios
      .post(`${API_URL}/auth/refresh`, {
        refreshToken,
      }, {
        timeout: 10000
      })
      .then((response) => {
        const data = response.data;

        if (!data?.success || !data?.token) {
          throw new Error(
            'Invalid refresh response'
          );
        }

        localStorage.setItem(
          'accessToken',
          data.token
        );

        if (data.refreshToken) {
          localStorage.setItem(
            'refreshToken',
            data.refreshToken
          );
        }

        window.dispatchEvent(
          new CustomEvent(
            'auth-token-refreshed',
            {
              detail: {
                token: data.token,
              },
            }
          )
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

/*
|--------------------------------------------------------------------------
| Request interceptor
|--------------------------------------------------------------------------
*/

apiClient.interceptors.request.use(
  async (config) => {
    const url = config.url || '';

    const isAuthEndpoint = url.includes('/auth/');

    if (isAuthEndpoint) {
      return config;
    }

    try {
      const token =
        await getValidToken();

      if (token) {
        config.headers =
          config.headers || {};

        config.headers.Authorization =
          token.startsWith('Bearer ')
            ? token
            : `Bearer ${token}`;
      }
    } catch {
      // Let server handle authentication
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| Response interceptor
|--------------------------------------------------------------------------
*/

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url =
      originalRequest.url || '';

    const isAuthEndpoint = url.includes('/auth/');

    if (
      error.response &&
      (error.response.status === 401 ||
        error.response.status === 403) &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const token =
          await getValidToken();

        if (token) {
          originalRequest.headers =
            originalRequest.headers || {};

          originalRequest.headers.Authorization =
            token.startsWith('Bearer ')
              ? token
              : `Bearer ${token}`;

          return apiClient(
            originalRequest
          );
        }
      } catch (refreshError) {
        return Promise.reject(
          refreshError
        );
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;