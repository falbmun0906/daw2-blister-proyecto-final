import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AccessibilityPage from './AccessibilityPage';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import type { User } from '../../types/auth.types';

vi.mock('../../services/auth.service', () => ({ updateProfile: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); useAuthStore.getState().clearSession(); });

it('serializes rapid changes and rolls a failed last edit back to the last confirmed settings', async () => {
  const user: User = { id: '507f1f77bcf86cd799439011', name: 'Synthetic', username: 'synthetic', email: 'synthetic@example.com', emailVerified: true, pendingEmail: null,
    settings: { theme: 'light', font: 'standard', fontSize: 'normal', notifications: { pushEnabled: false, doses: true, appointments: true, stock: true, expiration: true, cima: true, adherence: true, appointmentReminderPreset: '3h', customAppointmentReminderHours: 3 } } };
  useAuthStore.getState().setSession({ user, accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' });
  let resolveFirst!: (value: User) => void;
  let rejectSecond!: (reason: Error) => void;
  const save = vi.mocked(updateProfile)
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSecond = reject; }));
  const keyboard = userEvent.setup();
  render(<AccessibilityPage />, { wrapper: MemoryRouter });
  await keyboard.click(screen.getByRole('radio', { name: 'Oscuro' }));
  await keyboard.click(screen.getByRole('switch'));
  expect(save).toHaveBeenCalledTimes(1);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  await act(async () => resolveFirst({ ...user, settings: { ...user.settings, theme: 'dark' } }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0]).toMatchObject({ settings: { theme: 'dark', font: 'dyslexic' } });
  await act(async () => rejectSecond(new Error('Synthetic network failure')));
  await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false'));
  expect(useAuthStore.getState().user?.settings).toMatchObject({ theme: 'dark', font: 'standard' });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});
