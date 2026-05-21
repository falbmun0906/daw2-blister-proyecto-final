const APP_VIEWPORT_HEIGHT_PROPERTY = '--size-app-viewport-height';

const readViewportHeight = (): number => {
  const layoutHeight = window.innerHeight;
  const visualHeight = window.visualViewport?.height;
  const viewportHeight = typeof visualHeight === 'number' && Number.isFinite(visualHeight)
    ? visualHeight
    : layoutHeight;
  const cappedHeight = layoutHeight > 0 ? Math.min(viewportHeight, layoutHeight) : viewportHeight;

  return Math.max(1, Math.round(cappedHeight));
};

export const initializeAppViewportHeight = (): void => {
  if (typeof window === 'undefined') return;

  let animationFrameId: number | null = null;

  const syncViewportHeight = () => {
    animationFrameId = null;
    document.documentElement.style.setProperty(
      APP_VIEWPORT_HEIGHT_PROPERTY,
      `${readViewportHeight()}px`,
    );
  };

  const scheduleSync = () => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = window.requestAnimationFrame(syncViewportHeight);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') scheduleSync();
  };

  syncViewportHeight();

  window.addEventListener('resize', scheduleSync, { passive: true });
  window.addEventListener('orientationchange', scheduleSync);
  window.visualViewport?.addEventListener('resize', scheduleSync, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleSync, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);
};