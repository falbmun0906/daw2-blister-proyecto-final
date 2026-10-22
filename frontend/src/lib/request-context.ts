import { useAuthStore } from '../stores/auth.store';
import { useBlisterStore } from '../stores/blister.store';

const requests = new Map<string, number>();
let workspaceVersion = 0;
useBlisterStore.subscribe((state, previous) => {
  if (state.activeBlisterId !== previous.activeBlisterId || state.activeRole !== previous.activeRole) workspaceVersion += 1;
});

/** A response may commit only to the session/workspace that started it. */
export function captureRequestContext(key?: string, includeBlister = true): () => boolean {
  const sessionVersion = useAuthStore.getState().sessionVersion;
  const version = workspaceVersion;
  const requestId = key ? (requests.get(key) ?? 0) + 1 : 0;
  if (key) requests.set(key, requestId);
  return () => useAuthStore.getState().sessionVersion === sessionVersion
    && (!includeBlister || workspaceVersion === version)
    && (!key || requests.get(key) === requestId);
}
