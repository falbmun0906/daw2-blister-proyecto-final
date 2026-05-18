import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { TbRefresh, TbSparkles } from 'react-icons/tb';

import { APP_COMMIT, APP_RELEASE_NOTES, APP_VERSION } from '../../constants/app-version.constants';
import {
  markCurrentAppVersionSeen,
  readLastSeenAppVersion,
  shouldShowReleaseNotes,
} from '../../lib/app-version-storage';
import { useUiStore } from '../../stores/ui.store';
import { Button } from '../atoms/Button';
import { Modal } from '../atoms/Modal';

const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const UPDATE_CHECK_MIN_GAP_MS = 30 * 1000;
const APP_VERSION_MANIFEST_PATH = '/version.json';

type UpdateServiceWorker = ReturnType<typeof registerSW>;

interface PublishedAppVersion {
  version?: string;
  commit?: string;
}

interface RegistrationUpdateChecksOptions {
  registration: ServiceWorkerRegistration;
  showUpdateAvailable: () => void;
  notifyIfPublishedAppChanged: () => Promise<void>;
  updateCheckInFlightRef: MutableRefObject<boolean>;
  lastUpdateCheckAtRef: MutableRefObject<number>;
}

const canUseServiceWorker = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator;

const readPublishedAppVersion = async (): Promise<PublishedAppVersion | null> => {
  const url = new URL(APP_VERSION_MANIFEST_PATH, window.location.origin);
  url.searchParams.set('t', Date.now().toString());

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;

  const payload = await response.json() as Partial<Record<keyof PublishedAppVersion, unknown>>;

  return {
    version: typeof payload.version === 'string' ? payload.version : undefined,
    commit: typeof payload.commit === 'string' ? payload.commit : undefined,
  };
};

const hasPublishedAppChanged = (publishedApp: PublishedAppVersion): boolean =>
  Boolean(
    (publishedApp.version && publishedApp.version !== APP_VERSION)
      || (publishedApp.commit && publishedApp.commit !== APP_COMMIT),
  );

const attachRegistrationUpdateChecks = ({
  registration,
  showUpdateAvailable,
  notifyIfPublishedAppChanged,
  updateCheckInFlightRef,
  lastUpdateCheckAtRef,
}: RegistrationUpdateChecksOptions): (() => void) => {
  const checkForUpdate = async (force = false): Promise<void> => {
    if (!navigator.onLine || updateCheckInFlightRef.current) return;

    const now = Date.now();
    if (!force && now - lastUpdateCheckAtRef.current < UPDATE_CHECK_MIN_GAP_MS) return;

    updateCheckInFlightRef.current = true;
    lastUpdateCheckAtRef.current = now;

    try {
      await registration.update();

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateAvailable();
      }

      await notifyIfPublishedAppChanged();
    } catch {
      // Keep the installed app usable; the next lifecycle check will retry.
    } finally {
      updateCheckInFlightRef.current = false;
    }
  };
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  };
  const handleFocus = () => {
    void checkForUpdate();
  };
  const handleOnline = () => {
    void checkForUpdate(true);
  };
  const intervalId = window.setInterval(() => {
    void checkForUpdate();
  }, UPDATE_CHECK_INTERVAL_MS);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleOnline);
  void checkForUpdate(true);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleOnline);
  };
};

export function PwaUpdatePrompt() {
  const addToast = useUiStore((state) => state.addToast);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(() =>
    shouldShowReleaseNotes(readLastSeenAppVersion()),
  );
  const updateSWRef = useRef<UpdateServiceWorker | null>(null);
  const registrationCleanupRef = useRef<(() => void) | null>(null);
  const updateCheckInFlightRef = useRef(false);
  const lastUpdateCheckAtRef = useRef(0);
  const updateToastShownRef = useRef(false);
  const publishedVersionToastShownRef = useRef(false);

  const showUpdateAvailable = useCallback(() => {
    setUpdateAvailable(true);

    if (!updateToastShownRef.current) {
      updateToastShownRef.current = true;
      addToast({
        message: 'Hay una nueva versión disponible.',
        variant: 'info',
        durationMs: 8000,
      });
    }
  }, [addToast]);

  const notifyIfPublishedAppChanged = useCallback(async () => {
    if (publishedVersionToastShownRef.current) return;

    try {
      const publishedApp = await readPublishedAppVersion();

      if (!publishedApp || !hasPublishedAppChanged(publishedApp)) return;

      publishedVersionToastShownRef.current = true;
      addToast({
        message: 'Hay una versión nueva publicada. Preparando actualización...',
        variant: 'info',
        durationMs: 8000,
      });
    } catch {
      // The normal service worker update check still covers app updates.
    }
  }, [addToast]);

  useEffect(() => {
    const lastSeenVersion = readLastSeenAppVersion();

    if (!lastSeenVersion) {
      markCurrentAppVersionSeen();
    }
  }, []);

  useEffect(() => {
    if (!canUseServiceWorker()) return undefined;

    updateSWRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        showUpdateAvailable();
      },
      onRegisteredSW(_swUrl, registration) {
        registrationCleanupRef.current?.();

        if (!registration) return;

        registrationCleanupRef.current = attachRegistrationUpdateChecks({
          registration,
          showUpdateAvailable,
          notifyIfPublishedAppChanged,
          updateCheckInFlightRef,
          lastUpdateCheckAtRef,
        });
      },
      onRegisterError() {
        addToast({
          message: 'No se ha podido preparar la actualización offline.',
          variant: 'warning',
        });
      },
    });

    return () => {
      registrationCleanupRef.current?.();
      registrationCleanupRef.current = null;
    };
  }, [notifyIfPublishedAppChanged, showUpdateAvailable, addToast]);

  const handleUpdateNow = useCallback(async () => {
    if (!updateSWRef.current) return;

    setIsUpdating(true);
    try {
      await updateSWRef.current(true);
    } catch {
      setIsUpdating(false);
      addToast({
        message: 'No se ha podido actualizar ahora. Inténtalo de nuevo.',
        variant: 'error',
      });
    }
  }, [addToast]);

  const handleReleaseNotesClose = () => {
    markCurrentAppVersionSeen();
    setReleaseNotesOpen(false);
  };

  return (
    <>
      <Modal
        open={updateAvailable}
        title="Hay una nueva versión disponible"
        onClose={() => undefined}
        hideCloseButton
        disableBackdropClose
      >
        <div className="c-pwa-update-prompt">
          <span className="c-pwa-update-prompt__icon" aria-hidden="true">
            <TbRefresh />
          </span>
          <p className="c-pwa-update-prompt__text">
            Actualiza para cargar la última versión de Blíster y evitar seguir usando archivos antiguos.
          </p>
          <Button fullWidth onClick={handleUpdateNow} loading={isUpdating}>
            Actualizar ahora
          </Button>
        </div>
      </Modal>

      <Modal
        open={!updateAvailable && releaseNotesOpen}
        title="Novedades de Blíster"
        onClose={handleReleaseNotesClose}
      >
        <div className="c-pwa-update-prompt">
          <span className="c-pwa-update-prompt__icon" aria-hidden="true">
            <TbSparkles />
          </span>
          <p className="c-pwa-update-prompt__version">
            Versión {APP_VERSION} - Código {APP_COMMIT}
          </p>
          <ul className="c-pwa-update-prompt__notes">
            {APP_RELEASE_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <Button fullWidth onClick={handleReleaseNotesClose}>
            Entendido
          </Button>
        </div>
      </Modal>
    </>
  );
}
