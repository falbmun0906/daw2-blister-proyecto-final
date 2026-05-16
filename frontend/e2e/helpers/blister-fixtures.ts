import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { type Page, type Route } from '@playwright/test';

export const testUserId = '507f1f77bcf86cd799439011';
export const testBlisterId = '507f1f77bcf86cd799439012';
export const testAppointmentId = '507f1f77bcf86cd799439013';

export const testUser = {
  id: testUserId,
  name: 'Ana Lopez',
  username: 'ana.lopez',
  email: 'ana@example.com',
  emailVerified: true,
  pendingEmail: null,
  settings: {
    theme: 'system',
    font: 'standard',
    fontSize: 'normal',
    notifications: {
      pushEnabled: false,
      doses: true,
      appointments: true,
      stock: true,
      expiration: true,
      cima: true,
      adherence: true,
      appointmentReminderPreset: '3h',
      customAppointmentReminderHours: 3,
    },
  },
};

const buildBlister = (role: 'OWNER' | 'CAREGIVER' | 'OBSERVER') => ({
  _id: testBlisterId,
  name: 'Casa familiar',
  avatarKey: null,
  members: [
    {
      userId: testUserId,
      role,
      fullName: 'Ana Lopez',
      username: 'ana.lopez',
      avatarKey: null,
    },
  ],
  inviteCode: null,
  deletedAt: null,
  medicinesCount: 0,
  treatmentsCount: 0,
});

const success = (data: unknown, meta?: unknown) => ({
  success: true,
  data,
  ...(meta ? { meta } : {}),
});

const paginatedMeta = { page: 1, limit: 100, total: 0, totalPages: 0 };

const fulfillJson = (route: Route, data: unknown, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

interface MockApiOptions {
  role?: 'OWNER' | 'CAREGIVER' | 'OBSERVER';
  onAppointmentCreate?: (payload: unknown) => void;
}

export async function mockBlisterApi(page: Page, options: MockApiOptions = {}): Promise<void> {
  const role = options.role ?? 'OWNER';
  const blister = buildBlister(role);

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const apiPath = url.pathname.replace('/api/v1', '') || '/';
    const method = request.method();

    if (method === 'POST' && (apiPath === '/auth/login' || apiPath === '/auth/register')) {
      await fulfillJson(route, success({ user: testUser, accessToken: 'access-token', refreshToken: 'refresh-token' }), apiPath === '/auth/register' ? 201 : 200);
      return;
    }

    if (method === 'POST' && apiPath === '/auth/logout') {
      await fulfillJson(route, success(null));
      return;
    }

    if (method === 'GET' && apiPath === '/blisters') {
      await fulfillJson(route, success([blister]));
      return;
    }

    if (method === 'GET' && apiPath === `/blisters/${testBlisterId}/appointments`) {
      await fulfillJson(route, success([], paginatedMeta));
      return;
    }

    if (method === 'POST' && apiPath === `/blisters/${testBlisterId}/appointments`) {
      const payload = request.postDataJSON();
      options.onAppointmentCreate?.(payload);
      await fulfillJson(route, success({
        id: testAppointmentId,
        blisterId: testBlisterId,
        patientUserId: testUserId,
        title: typeof payload === 'object' && payload !== null && 'title' in payload ? payload.title : 'Consulta medica',
        location: typeof payload === 'object' && payload !== null && 'location' in payload ? payload.location : null,
        description: typeof payload === 'object' && payload !== null && 'description' in payload ? payload.description : null,
        date: typeof payload === 'object' && payload !== null && 'date' in payload ? payload.date : '2031-05-06T08:30:00.000Z',
        treatmentId: null,
        comments: [],
      }), 201);
      return;
    }

    if (method === 'GET' && apiPath === `/blisters/${testBlisterId}/treatments`) {
      await fulfillJson(route, success([], paginatedMeta));
      return;
    }

    if (method === 'GET' && apiPath === `/blisters/${testBlisterId}/medicines`) {
      await fulfillJson(route, success([], paginatedMeta));
      return;
    }

    if (method === 'GET' && apiPath === '/me/upcoming-doses') {
      await fulfillJson(route, success([]));
      return;
    }

    if (method === 'GET' && apiPath === '/me/calendar') {
      await fulfillJson(route, success({ appointments: [], doses: [] }));
      return;
    }

    if (method === 'GET' && apiPath === '/notifications') {
      await fulfillJson(route, success([], { page: 1, limit: 12, total: 0, totalPages: 0 }));
      return;
    }

    if (method === 'GET' && apiPath === '/notifications/push/config') {
      await fulfillJson(route, success({ enabled: false, publicKey: null }));
      return;
    }

    if (method === 'GET' && apiPath === '/notifications/push/subscriptions') {
      await fulfillJson(route, success([]));
      return;
    }

    await fulfillJson(route, success(null));
  });
}

export async function seedAuthenticatedState(
  page: Page,
  role: 'OWNER' | 'CAREGIVER' | 'OBSERVER' = 'OWNER',
): Promise<void> {
  const blister = buildBlister(role);
  await page.addInitScript(({ user, activeBlister }) => {
    window.sessionStorage.setItem('blister-ui', JSON.stringify({
      hasSeenOnboarding: true,
      canReplayOnboarding: false,
    }));
    window.sessionStorage.setItem('blister-desktop-use-here', 'true');
    window.sessionStorage.setItem('blister-auth', JSON.stringify({
      state: {
        user,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
      version: 0,
    }));
    window.localStorage.setItem('blister-active', JSON.stringify({
      state: {
        blisters: [activeBlister],
        activeBlisterId: activeBlister._id,
        activeRole: activeBlister.members[0].role,
      },
      version: 0,
    }));
  }, { user: testUser, activeBlister: blister });
}

export async function seedSeenOnboarding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('blister-ui', JSON.stringify({
      hasSeenOnboarding: true,
      canReplayOnboarding: false,
    }));
    window.sessionStorage.setItem('blister-desktop-use-here', 'true');
  });
}

export async function ensureEvidenceDirectory(): Promise<string> {
  const directory = path.resolve(process.cwd(), '../docs/assets/evidence');
  await mkdir(directory, { recursive: true });
  return directory;
}