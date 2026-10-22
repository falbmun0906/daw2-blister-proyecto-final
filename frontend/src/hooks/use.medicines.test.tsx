import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useMedicines } from './use.medicines';
import { listMedicines } from '../services/medicines.service';
import { useBlisterStore } from '../stores/blister.store';
import { useMedicinesStore } from '../stores/medicines.store';
import type { Medicine } from '../types/medicine.types';

vi.mock('../services/medicines.service', () => ({ listMedicines: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); useMedicinesStore.getState().clear(); });
const synthetic = (blisterId: string) => ({ _id: blisterId, blisterId, nombre: `Synthetic ${blisterId}` }) as Medicine;

it('ignores the old blister response when it arrives after the new one', async () => {
  let resolveA!: (items: Medicine[]) => void;
  useBlisterStore.getState().setActiveBlister('A', 'OWNER');
  vi.mocked(listMedicines).mockImplementation((id) => id === 'A'
    ? new Promise((resolve) => { resolveA = resolve; }) : Promise.resolve([synthetic('B')]));
  const hook = renderHook(() => useMedicines());
  await waitFor(() => expect(listMedicines).toHaveBeenCalledWith('A'));
  act(() => useBlisterStore.getState().setActiveBlister('B', 'OWNER'));
  await waitFor(() => expect(hook.result.current.medicines[0]?.blisterId).toBe('B'));
  await act(async () => resolveA([synthetic('A')]));
  expect(useMedicinesStore.getState().medicines[0].blisterId).toBe('B');
  expect(hook.result.current.isLoading).toBe(false);
});

it('ends loading in both consumers when only the latest request may update the shared store', async () => {
  const resolvers: Array<(items: Medicine[]) => void> = [];
  useBlisterStore.getState().setActiveBlister('A', 'OWNER');
  vi.mocked(listMedicines).mockImplementation(() => new Promise((resolve) => { resolvers.push(resolve); }));
  const first = renderHook(() => useMedicines());
  const second = renderHook(() => useMedicines());
  await waitFor(() => expect(resolvers).toHaveLength(2));
  await act(async () => { resolvers[1]([synthetic('A')]); resolvers[0]([]); });
  expect(first.result.current.isLoading).toBe(false);
  expect(second.result.current.isLoading).toBe(false);
  expect(first.result.current.medicines).toHaveLength(1);
});
