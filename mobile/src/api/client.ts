import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSecureItem, storeTokens, clearTokens, TOKEN_KEYS } from '../utils/secureStorage';
import { Platform } from 'react-native';

let _configUrl: string | undefined;
let _apiTimeoutMs: number | undefined;
try {
  const Config = require('react-native-config').default;
  _configUrl = Config?.API_BASE_URL;
  const rawTimeout = Config?.API_TIMEOUT_MS;
  if (rawTimeout) _apiTimeoutMs = Number(rawTimeout);
} catch {
  _configUrl = undefined;
}

const fallbackUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api/v1'
  : 'http://localhost:8000/api/v1';

export const API_BASE_URL = _configUrl || fallbackUrl;
const API_TIMEOUT_MS = (_apiTimeoutMs && !Number.isNaN(_apiTimeoutMs)) ? _apiTimeoutMs : 15_000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
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
  if (!config.headers?.Authorization) {
    const token = await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
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
          return Promise.reject(error);
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
        const { useAuthStore } = require('../store/authStore');
        await useAuthStore.getState().signOut();
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

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your input.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You don\u2019t have permission to do that.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. Please refresh and try again.',
  422: 'Some of the information provided is invalid.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again later.',
  502: 'The server is temporarily unavailable. Please try again.',
  503: 'The service is temporarily unavailable. Please try again later.',
};

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'The request timed out. Please check your connection and try again.';
      }
      return 'Network error. Please check your connection and try again.';
    }
    const status = error.response.status;

    // Silently swallow server errors -- nothing useful to show the user
    if (status >= 500) {
      return '';
    }

    const apiError = error.response?.data?.error as ApiError | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
    const statusMsg = STATUS_MESSAGES[status];
    if (statusMsg) return statusMsg;
  }
  return 'An unexpected error occurred. Please try again.';
}

export function extractApiErrorDetails(error: unknown): ApiError | null {
  if (axios.isAxiosError(error)) {
    return (error.response?.data?.error as ApiError) ?? null;
  }
  return null;
}
