import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { API_TIMEOUT_MS, VITE_API_URL } from '../constants/api.constants';
import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/auth.store';
import { resetAppStores } from '../stores/reset-stores';
import { authTokensSchema } from '../../../shared/schemas/auth.schema';
import type { ApiErrorResponse, ApiResponse } from '../types/api.types';
import { ApiError } from '../types/api.types';
import type { AuthTokens } from '../types/auth.types';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _sessionVersion?: number;
}

const rawClient = axios.create({
  baseURL: VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

export const apiClient = axios.create({
  baseURL: VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

let refreshPromise: Promise<AuthTokens> | null = null;
let refreshSessionVersion: number | null = null;

const staleSessionError = () => new ApiError('La sesión ha cambiado.', { code: 'AUTH_SESSION_CHANGED' });

const isAuthEndpoint = (url: string | undefined): boolean =>
  Boolean(url && (
    url.includes('/auth/login')
    || url.includes('/auth/register')
    || url.includes('/auth/refresh')
    || url.includes('/auth/forgot-password')
    || url.includes('/auth/reset-password')
    || url.includes('/auth/confirm-email')
  ));

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
  resetAppStores();
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
  const { refreshToken, user, sessionVersion } = useAuthStore.getState();
  if (!refreshPromise || refreshSessionVersion !== sessionVersion) {

    if (!refreshToken || !user) {
      clearSessionAndRedirect();
      throw new ApiError('Session expired.', {
        status: 401,
        code: 'AUTH_SESSION_EXPIRED',
      });
    }

    refreshSessionVersion = sessionVersion;
    const pending = rawClient
      .post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken })
      .then((response) => authTokensSchema.parse(response.data.data))
      .then((tokens) => {
        if (useAuthStore.getState().sessionVersion !== sessionVersion) throw staleSessionError();
        // Token rotation preserves the session identity and current user edits.
        useAuthStore.setState({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });

        return tokens;
      })
      .catch((error: unknown) => {
        if (useAuthStore.getState().sessionVersion === sessionVersion) clearSessionAndRedirect();
        throw normalizeApiError(error);
      })
      .finally(() => {
        if (refreshPromise === pending) refreshPromise = null;
      });
    refreshPromise = pending;
  }

  return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
  const { accessToken, sessionVersion } = useAuthStore.getState();
  const request = config as RetryableRequestConfig;
  if (request._sessionVersion !== undefined && request._sessionVersion !== sessionVersion) throw staleSessionError();
  request._sessionVersion = sessionVersion;

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
  (response: AxiosResponse) => {
    const version = (response.config as RetryableRequestConfig)._sessionVersion;
    if (version !== undefined && version !== useAuthStore.getState().sessionVersion) throw staleSessionError();
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (originalRequest?._sessionVersion !== undefined && originalRequest._sessionVersion !== useAuthStore.getState().sessionVersion) {
      return Promise.reject(staleSessionError());
    }

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
