import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { ApiError } from '../../types/api.types';
import type { AuthSession } from '../../types/auth.types';
import RegisterPage from './RegisterPage';

vi.mock('../../services/auth.service', () => ({
  register: vi.fn(),
}));

const registerMock = vi.mocked(register);

const session: AuthSession = {
  accessToken: 'register-access-token',
  refreshToken: 'register-refresh-token',
  user: {
    id: '507f1f77bcf86cd799439011',
    name: 'Ana Lopez',
    username: 'ana.lopez',
    email: 'ana@example.com',
    emailVerified: false,
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

const renderPage = () => render(<RegisterPage />, { wrapper: MemoryRouter });

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

describe('RegisterPage', () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useUiStore.getState().clearToasts();
    registerMock.mockReset();
    setupMatchMedia();
  });

  it('shows Spanish consent and password feedback before calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Lopez');
    await user.type(screen.getByPlaceholderText('nombre_usuario'), 'ana.lopez');
    await user.type(screen.getByLabelText('Correo electronico'), 'ana@example.com');
    await user.type(screen.getAllByPlaceholderText('********')[0], 'abc');
    await user.type(screen.getAllByPlaceholderText('********')[1], 'abcd');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(screen.getByLabelText('Requisitos de contrasena')).toBeVisible();
    expect(screen.getByText('8 caracteres')).toBeVisible();
    expect(await screen.findByText('Debes aceptar la política de privacidad.')).toBeVisible();
    expect(screen.getByText('Debes confirmar que tienes 18 años o más.')).toBeVisible();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('maps server field validation details to visible form errors', async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValue(new ApiError('Conflict', {
      code: 'AUTH_EMAIL_CONFLICT',
      status: 409,
      details: ['email: Este correo ya está registrado.'],
    }));
    renderPage();

    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Lopez');
    await user.type(screen.getByPlaceholderText('nombre_usuario'), 'ana.lopez');
    await user.type(screen.getByLabelText('Correo electronico'), 'ana@example.com');
    await user.type(screen.getAllByPlaceholderText('********')[0], 'Password1!');
    await user.type(screen.getAllByPlaceholderText('********')[1], 'Password1!');
    await user.click(screen.getByLabelText(/Acepto la/));
    await user.click(screen.getByLabelText('Confirmo que tengo 18 años o mas'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Este correo ya está registrado.')).toBeVisible();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('stores a session after a valid registration', async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValue(session);
    renderPage();

    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Lopez');
    await user.type(screen.getByPlaceholderText('nombre_usuario'), 'ana.lopez');
    await user.type(screen.getByLabelText('Correo electronico'), 'ana@example.com');
    await user.type(screen.getAllByPlaceholderText('********')[0], 'Password1!');
    await user.type(screen.getAllByPlaceholderText('********')[1], 'Password1!');
    await user.click(screen.getByLabelText(/Acepto la/));
    await user.click(screen.getByLabelText('Confirmo que tengo 18 años o mas'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('register-access-token'));
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'ana@example.com',
      privacyConsent: true,
      ageConfirmed: true,
    }));
  });
});