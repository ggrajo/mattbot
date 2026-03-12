import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSecureItem, storeTokens, clearTokens, TOKEN_KEYS } from '../utils/secureStorage';

export const API_BASE_URL = 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else if (token) {
      p.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getSecureItem(TOKEN_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
          refresh_token: refreshToken,
        });

        await storeTokens(data.access_token, data.refresh_token);
        processQueue(null, data.access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiError {
  code: string;
  message: string;
  request_id: string;
  details: Array<{ field?: string; message: string }>;
}

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error as ApiError | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
    if (!error.response) {
      return 'Network error. Please check your connection and try again.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
}
