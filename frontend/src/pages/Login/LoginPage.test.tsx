import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { ApiError } from '../../types/api.types';
import type { AuthSession } from '../../types/auth.types';
import LoginPage from './LoginPage';
import { login } from '../../services/auth.service';

vi.mock('../../services/auth.service', () => ({
  login: vi.fn(),
}));

const loginMock = vi.mocked(login);

const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
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
  },
};

const renderPage = () => render(<LoginPage />, { wrapper: MemoryRouter });

const setupMatchMedia = (): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('LoginPage', () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useUiStore.getState().clearToasts();
    loginMock.mockReset();
    setupMatchMedia();
  });

  it('shows Spanish field feedback when required values are missing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('El usuario o correo electrónico debe tener al menos 3 caracteres.')).toBeVisible();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeVisible();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('links to the password reminder flow', () => {
    renderPage();

    expect(screen.getByRole('checkbox', { name: 'Recordarme' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'He olvidado mi contraseña' })).toHaveAttribute('href', '/forgot-password');
  });

  it('remembers the login identifier only when the checkbox is enabled', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(session);
    renderPage();

    await user.type(screen.getByLabelText('Usuario o correo electrónico'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Password1!');
    await user.click(screen.getByRole('checkbox', { name: 'Recordarme' }));
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(localStorage.getItem('blister-login-identifier')).toBe('ana@example.com'));
  });

  it('shows a neutral credential error without mutating the session', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError('Invalid credentials', { code: 'AUTH_INVALID_CREDENTIALS', status: 401 }));
    renderPage();

    await user.type(screen.getByLabelText('Usuario o correo electrónico'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Password1!');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Usuario o contraseña incorrectos. Verifique e intente nuevamente.')).toBeVisible();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('stores the authenticated session after a valid login', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(session);
    renderPage();

    await user.type(screen.getByLabelText('Usuario o correo electrónico'), ' ana@example.com ');
    await user.type(screen.getByLabelText('Contraseña'), ' Password1! ');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('access-token'));
    expect(loginMock).toHaveBeenCalledWith({ identifier: 'ana@example.com', password: 'Password1!' });
  });
});