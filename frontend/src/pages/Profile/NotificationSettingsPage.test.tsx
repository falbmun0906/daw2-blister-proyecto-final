import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  subscribeToServerPush,
  unsubscribeFromServerPush,
} from '../../lib/push-notifications';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import type { User } from '../../types/auth.types';
import NotificationSettingsPage from './NotificationSettingsPage';

vi.mock('../../lib/push-notifications', () => ({
  subscribeToServerPush: vi.fn(),
  unsubscribeFromServerPush: vi.fn(),
}));

vi.mock('../../services/auth.service', () => ({
  updateProfile: vi.fn(),
}));

const subscribeToServerPushMock = vi.mocked(subscribeToServerPush);
const unsubscribeFromServerPushMock = vi.mocked(unsubscribeFromServerPush);
const updateProfileMock = vi.mocked(updateProfile);

const baseUser: User = {
  id: '507f1f77bcf86cd799439011',
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
      stock: true,
      expiration: true,
      cima: true,
      adherence: true,
      doses: true,
      appointments: true,
      appointmentReminderPreset: '3h',
      customAppointmentReminderHours: 3,
    },
  },
};

const renderPage = (): void => {
  useAuthStore.getState().setSession({
    user: baseUser,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  });
  render(<NotificationSettingsPage />);
};

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useUiStore.getState().clearToasts();
    subscribeToServerPushMock.mockReset();
    unsubscribeFromServerPushMock.mockReset();
    updateProfileMock.mockReset();
    unsubscribeFromServerPushMock.mockResolvedValue(undefined);
  });

  it('updates push preferences immediately without a save button', async () => {
    const user = userEvent.setup();
    const updatedUser: User = {
      ...baseUser,
      settings: {
        ...baseUser.settings,
        notifications: {
          ...baseUser.settings.notifications,
          pushEnabled: true,
        },
      },
    };
    subscribeToServerPushMock.mockResolvedValue({ enabled: true });
    updateProfileMock.mockResolvedValue(updatedUser);
    renderPage();

    expect(screen.queryByRole('button', { name: /guardar preferencias/i })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Activar notificaciones push'));

    await waitFor(() => expect(updateProfileMock).toHaveBeenCalledWith({
      settings: {
        ...baseUser.settings,
        notifications: {
          ...baseUser.settings.notifications,
          pushEnabled: true,
        },
      },
    }));
    expect(subscribeToServerPushMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user?.settings.notifications.pushEnabled).toBe(true);
  });

  it('rolls back the push switch when browser subscription fails', async () => {
    const user = userEvent.setup();
    subscribeToServerPushMock.mockResolvedValue({
      enabled: false,
      reason: 'Activa los permisos de notificaciones del navegador.',
    });
    renderPage();

    await user.click(screen.getByLabelText('Activar notificaciones push'));

    expect(await screen.findByText('Activa los permisos de notificaciones del navegador.')).toBeVisible();
    expect(screen.getByLabelText('Activar notificaciones push')).not.toBeChecked();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });
});