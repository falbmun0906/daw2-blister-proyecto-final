import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { TbRefresh, TbSparkles } from 'react-icons/tb';

import { APP_RELEASE_NOTES, APP_VERSION } from '../../constants/app-version.constants';
import {
  markCurrentAppVersionSeen,
  readLastSeenAppVersion,
  shouldShowReleaseNotes,
} from '../../lib/app-version-storage';
import { useUiStore } from '../../stores/ui.store';
import { Button } from '../atoms/Button';
import { Modal } from '../atoms/Modal';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

type UpdateServiceWorker = ReturnType<typeof registerSW>;

const canUseServiceWorker = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator;

export function PwaUpdatePrompt() {
  const addToast = useUiStore((state) => state.addToast);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(() =>
    shouldShowReleaseNotes(readLastSeenAppVersion()),
  );
  const updateSWRef = useRef<UpdateServiceWorker | null>(null);
  const registrationCleanupRef = useRef<(() => void) | null>(null);
  const updateToastShownRef = useRef(false);

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
        setUpdateAvailable(true);

        if (!updateToastShownRef.current) {
          updateToastShownRef.current = true;
          addToast({
            message: 'Hay una nueva versión disponible.',
            variant: 'info',
            durationMs: 8000,
          });
        }
      },
      onRegisteredSW(_swUrl, registration) {
        registrationCleanupRef.current?.();

        if (!registration) return;

        const checkForUpdate = () => {
          if (!navigator.onLine) return;
          void registration.update();
        };
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        };
        const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', checkForUpdate);
        checkForUpdate();

        registrationCleanupRef.current = () => {
          window.clearInterval(intervalId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('online', checkForUpdate);
        };
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
  }, [addToast]);

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
          <p className="c-pwa-update-prompt__version">Versión {APP_VERSION}</p>
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