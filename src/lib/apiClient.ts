import { useStore } from '../store/useStore';

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const apiClient = async (
  endpoint: string,
  options: RequestInit = {},
  customHeaders: HeadersInit = {}
) => {
  const { accessToken, refreshToken, updateTokens, clearAuth } = useStore.getState();
  
  const headers = new Headers({
    ...customHeaders,
    ...options.headers,
  });

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const config = {
    ...options,
    headers,
  };

  let response = await fetch(endpoint, config);

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
    if (isRefreshing) {
      try {
        const token = await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        headers.set('Authorization', `Bearer ${token}`);
        return await fetch(endpoint, { ...options, headers });
      } catch (err) {
        return Promise.reject(err);
      }
    }

    const originalRequest = { ...config, url: endpoint };
    isRefreshing = true;

    try {
      const refreshResponse = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Session expired');
      }

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
      
      updateTokens(newAccessToken, newRefreshToken);
      
      processQueue(null, newAccessToken);
      
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      response = await fetch(endpoint, { ...options, headers });
    } catch (err) {
      processQueue(err, null);
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }

  return response;
};
