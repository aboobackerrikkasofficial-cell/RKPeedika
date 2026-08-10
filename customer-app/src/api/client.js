import axios from 'axios';

/* ============================================================
   TOKEN HELPERS
============================================================ */

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

/* ============================================================
   API CLIENT
============================================================ */

const apiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || '/api',

  headers: {
    'Content-Type': 'application/json',
  },

  timeout: 30000,
});

/* ============================================================
   REFRESH CONTROL
============================================================ */

let refreshTokenPromise = null;

/* ============================================================
   CLEAR AUTH
============================================================ */

function clearAuthSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  window.dispatchEvent(
    new Event('auth-logout')
  );

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

/* ============================================================
   GET VALID TOKEN
============================================================ */

async function getValidToken() {
  const token =
    localStorage.getItem('accessToken');

  if (!token) {
    return null;
  }

  const cleanToken = token.startsWith('Bearer ')
    ? token.substring(7)
    : token;

  /* Token still valid */
  if (!isTokenExpired(cleanToken)) {
    return token;
  }

  /* Token expired */
  const refreshToken =
    localStorage.getItem('refreshToken');

  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  /* Prevent multiple refresh requests */
  if (!refreshTokenPromise) {
    const backendUrl =
      import.meta.env.VITE_API_URL || '/api';

    refreshTokenPromise = axios
      .post(
        `${backendUrl}/auth/refresh`,
        {
          refreshToken,
        }
      )
      .then((res) => {
        const data = res.data;

        if (
          data.success &&
          data.token
        ) {
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
        }

        throw new Error(
          'Invalid refresh response'
        );
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

/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

apiClient.interceptors.request.use(
  async (config) => {
    const url = config.url || '';

    /* Public authentication endpoints */
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/register') ||
      url.includes('/auth/send-otp') ||
      url.includes('/auth/verify-otp') ||
      url.includes('/auth/guest-login')
    ) {
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
      /* Let API request handle auth error */
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

/* ============================================================
   RESPONSE INTERCEPTOR
============================================================ */

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status =
      error.response?.status;

    const isAuthError =
      status === 401 ||
      status === 403;

    const isAuthEndpoint =
      originalRequest.url?.includes(
        '/auth/login'
      ) ||
      originalRequest.url?.includes(
        '/auth/refresh'
      );

    if (
      isAuthError &&
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