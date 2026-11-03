import { useCallback, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { captureRequestContext } from '../lib/request-context';

/** Ignore late UI effects after navigation, unmount, logout or workspace changes.
 * The server may already have saved the mutation; the next screen reloads its data.
 */
export function useMutationContext() {
  const { key } = useLocation();
  const lifetime = useRef<{ active: boolean } | null>(null);
  useLayoutEffect(() => {
    const scope = { active: true };
    lifetime.current = scope;
    return () => {
      scope.active = false;
    };
  }, [key]);
  return useCallback(() => {
    const started = lifetime.current;
    const isCurrentContext = captureRequestContext();
    return () => started?.active === true && isCurrentContext();
  }, []);
}
