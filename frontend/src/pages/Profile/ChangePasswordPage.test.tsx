import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ChangePasswordPage from './ChangePasswordPage';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';

vi.mock('../../services/auth.service', () => ({ updateProfile: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); useAuthStore.getState().clearSession(); });

it('clears revoked credentials and returns to login after changing the password', async () => {
  // This page needs only successful completion, not the returned profile.
  vi.mocked(updateProfile).mockResolvedValueOnce({} as Awaited<ReturnType<typeof updateProfile>>);
  useAuthStore.setState({ accessToken: 'old-synthetic-access', refreshToken: 'old-synthetic-refresh' });
  sessionStorage.setItem('blister:mcp-token', 'synthetic-manual-token');
  render(<MemoryRouter initialEntries={['/change']}><Routes>
    <Route path="/change" element={<ChangePasswordPage />} />
    <Route path="/login" element={<h1>Login destination</h1>} />
  </Routes></MemoryRouter>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Contraseña actual'), 'Old#12345');
  await user.type(screen.getByLabelText('Nueva contraseña'), 'Changed#123');
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'Changed#123');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('heading', { name: 'Login destination' })).toBeVisible();
  expect(useAuthStore.getState().accessToken).toBeNull();
  expect(useAuthStore.getState().refreshToken).toBeNull();
  expect(sessionStorage.getItem('blister:mcp-token')).toBeNull();
});
