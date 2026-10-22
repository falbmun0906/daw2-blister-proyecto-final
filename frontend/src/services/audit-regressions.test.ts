import { AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api.client';
import { listCollection } from './pagination';
import { useAuthStore } from '../stores/auth.store';
import { useBlisterStore } from '../stores/blister.store';
import { resetAppStores } from '../stores/reset-stores';
import { captureRequestContext } from '../lib/request-context';
import type { AuthSession } from '../types/auth.types';

const clients = vi.hoisted(() => [] as AxiosInstance[]);
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, create: (config: Parameters<typeof actual.default.create>[0]) => {
    const client = actual.default.create(config);
    clients.push(client);
    return client;
  } } };
});

const session = (id: string): AuthSession => ({
  accessToken: `access-${id}`, refreshToken: `refresh-${id}`,
  user: { id, name: id, username: id, email: `${id}@example.com`, emailVerified: true, pendingEmail: null,
    settings: { theme: 'system', font: 'standard', fontSize: 'normal', notifications: {
      pushEnabled: false, doses: true, appointments: true, stock: true, expiration: true,
      cima: true, adherence: true, appointmentReminderPreset: '3h', customAppointmentReminderHours: 3,
    } },
  },
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const response = (config: InternalAxiosRequestConfig, data: unknown) => ({ config, data, status: 200, statusText: 'OK', headers: new AxiosHeaders() });

describe('session isolation and complete collections', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clearSession();
    resetAppStores();
  });

  it.each(['logout', 'new-login'] as const)('never reinstalls A when refresh resolves after %s', async (action) => {
    useAuthStore.getState().setSession(session('A'));
    const pendingRefresh = deferred<{ accessToken: string; refreshToken: string }>();
    const refreshStarted = deferred<void>();
    clients[0].defaults.adapter = async (config) => {
      refreshStarted.resolve();
      return response(config, { success: true, data: await pendingRefresh.promise });
    };
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, { ...response(config, {}), status: 401 });
    };
    const result = apiClient.get('/blisters').catch((error: unknown) => error);
    await refreshStarted.promise;
    useAuthStore.getState().clearSession();
    if (action === 'new-login') useAuthStore.getState().setSession(session('B'));
    pendingRefresh.resolve({ accessToken: 'rotated-A', refreshToken: 'rotated-refresh-A' });
    expect(await result).toBeInstanceOf(Error);
    expect(useAuthStore.getState().user?.id ?? null).toBe(action === 'logout' ? null : 'B');
    expect(useAuthStore.getState().accessToken).toBe(action === 'logout' ? null : 'access-B');
  });

  it('rejects a successful response from a session that has already ended', async () => {
    useAuthStore.getState().setSession(session('A'));
    const pending = deferred<unknown>();
    const started = deferred<void>();
    apiClient.defaults.adapter = async (config) => { started.resolve(); return response(config, await pending.promise); };
    const result = apiClient.get('/blisters').catch((error: unknown) => error);
    await started.promise;
    useAuthStore.getState().clearSession();
    pending.resolve({ success: true, data: ['private-A'] });
    expect(await result).toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
  });

  it('guards A→B→A workspace changes and requests arriving out of order', () => {
    useBlisterStore.getState().setActiveBlister('A', 'OWNER');
    const beforeSwitch = captureRequestContext('test-collection');
    useBlisterStore.getState().setActiveBlister('B', 'OWNER');
    useBlisterStore.getState().setActiveBlister('A', 'OWNER');
    expect(beforeSwitch()).toBe(false);
    const older = captureRequestContext('test-collection');
    const latest = captureRequestContext('test-collection');
    expect(older()).toBe(false);
    expect(latest()).toBe(true);
  });

  it('fetches the 101st resource and respects explicit page requests', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation(async (_url, config) => {
      const page = config?.params.page as number;
      return { data: { success: true, data: page === 1 ? Array.from({ length: 100 }, (_, index) => index) : [100], meta: { page, limit: 100, total: 101, totalPages: 2 } } };
    });
    const items = await listCollection('/synthetic', Number);
    expect(items).toHaveLength(101);
    expect(items.at(-1)).toBe(100);
    expect(get).toHaveBeenCalledTimes(2);
    get.mockClear();
    expect(await listCollection('/synthetic', Number, { page: 2 })).toEqual([100]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('removes the one-time MCP credential when clearing application data', () => {
    sessionStorage.setItem('blister:mcp-token', 'synthetic-secret');
    resetAppStores();
    expect(sessionStorage.getItem('blister:mcp-token')).toBeNull();
  });
});
