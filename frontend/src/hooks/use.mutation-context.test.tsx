import { act, cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { useAuthStore } from '../stores/auth.store';
import { useBlisterStore } from '../stores/blister.store';
import { useMutationContext } from './use.mutation-context';

afterEach(() => {
  cleanup();
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useBlisterStore.setState(useBlisterStore.getInitialState(), true);
  localStorage.clear();
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

it('invalidates pending UI effects after navigation and unmount', () => {
  const { result, unmount } = renderHook(
    () => ({ capture: useMutationContext(), navigate: useNavigate() }),
    { wrapper },
  );
  const first = result.current.capture();
  expect(first()).toBe(true);
  act(() => result.current.navigate('/elsewhere'));
  expect(first()).toBe(false);
  const second = result.current.capture();
  expect(second()).toBe(true);
  unmount();
  expect(second()).toBe(false);
});

it('invalidates a save after workspace, role or session changes', () => {
  const { result } = renderHook(useMutationContext, { wrapper });
  const workspace = result.current();
  act(() => useBlisterStore.setState({ activeBlisterId: '507f1f77bcf86cd799439099' }));
  expect(workspace()).toBe(false);
  const role = result.current();
  act(() => useBlisterStore.setState({ activeRole: 'OBSERVER' }));
  expect(role()).toBe(false);
  const session = result.current();
  act(() => useAuthStore.setState((state) => ({ sessionVersion: state.sessionVersion + 1 })));
  expect(session()).toBe(false);
});
