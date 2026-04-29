import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { VITE_API_URL } from '../constants/api.constants';
import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/auth.store';
import { authTokensSchema } from '../../../shared/schemas/auth.schema';
import type { ApiErrorResponse, ApiResponse } from '../types/api.types';
import { ApiError } from '../types/api.types';
import type { AuthTokens } from '../types/auth.types';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const rawClient = axios.create({
  baseURL: VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = axios.create({
  baseURL: VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<AuthTokens> | null = null;

const isAuthEndpoint = (url: string | undefined): boolean =>
  Boolean(url && (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')));

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { success?: unknown; error?: unknown };
  if (candidate.success !== false || typeof candidate.error !== 'object' || candidate.error === null) {
    return false;
  }

  const error = candidate.error as { code?: unknown; message?: unknown };
  return typeof error.code === 'string' && typeof error.message === 'string';
};

const normalizeApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (isApiErrorResponse(responseData)) {
      return new ApiError(responseData.error.message, {
        status: error.response?.status,
        code: responseData.error.code,
        details: responseData.error.details,
        cause: error,
      });
    }

    return new ApiError(error.message, {
      status: error.response?.status,
      details: responseData,
      cause: error,
    });
  }

  return new ApiError(error instanceof Error ? error.message : 'Unexpected API error.', {
    cause: error,
  });
};

const redirectToLogin = (): void => {
  if (window.location.pathname !== ROUTES.login) {
    window.location.assign(ROUTES.login);
  }
};

const clearSessionAndRedirect = (): void => {
  useAuthStore.getState().clearSession();
  redirectToLogin();
};

const attachAuthorizationHeader = (
  config: RetryableRequestConfig,
  accessToken: string,
): RetryableRequestConfig => {
  config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
};

const refreshAccessToken = async (): Promise<AuthTokens> => {
  if (!refreshPromise) {
    const { refreshToken, user } = useAuthStore.getState();

    if (!refreshToken || !user) {
      clearSessionAndRedirect();
      throw new ApiError('Session expired.', {
        status: 401,
        code: 'AUTH_SESSION_EXPIRED',
      });
    }

    refreshPromise = rawClient
      .post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken })
      .then((response) => authTokensSchema.parse(response.data.data))
      .then((tokens) => {
        useAuthStore.getState().setSession({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });

        return tokens;
      })
      .catch((error: unknown) => {
        clearSessionAndRedirect();
        throw normalizeApiError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    attachAuthorizationHeader(config as RetryableRequestConfig, accessToken);
  }

  return config;
});

/**
 * Response interceptor: solo refresca tokens en `401`. Cualquier otro status
 * se propaga tal cual al consumidor. En particular:
 * - `403 BLISTER_ROLE_FORBIDDEN`: se entrega como `ApiError` para que la UI
 *   muestre un mensaje de permisos (no se reintenta y no toca la sesi�n).
 * - `409 BLISTER_OWNER_PROTECTION`: idem, lo gestiona la p�gina que lo dispar�.
 * Las rutas de `/auth/*` se excluyen del refresh para evitar bucles.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest || !error.response) {
      return Promise.reject(normalizeApiError(error));
    }

    if (error.response.status !== 401 || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(normalizeApiError(error));
    }

    originalRequest._retry = true;

    try {
      const tokens = await refreshAccessToken();
      return apiClient(attachAuthorizationHeader(originalRequest, tokens.accessToken));
    } catch (refreshError: unknown) {
      return Promise.reject(normalizeApiError(refreshError));
    }
  },
);

export const normalizeApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => response.data.data;