import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { useUiStore } from '../../stores/ui.store';

interface DesktopDeviceShellProps {
  children: ReactNode;
}

const DESKTOP_QUERY = '(min-width: 48rem)';
const SESSION_KEY = 'blister-desktop-use-here';

function getInitialDesktopMatch(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getInitialAccepted(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function DesktopDeviceShell({ children }: DesktopDeviceShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasSeenOnboarding = useUiStore((state) => state.hasSeenOnboarding);
  const [isDesktop, setIsDesktop] = useState(getInitialDesktopMatch);
  const [accepted, setAccepted] = useState(getInitialAccepted);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const isLanding = location.pathname === ROUTES.landing || location.pathname === ROUTES.root;

  if (!isDesktop || isLanding) {
    return <>{children}</>;
  }

  const handleUseHere = () => {
    window.sessionStorage.setItem(SESSION_KEY, 'true');
    setAccepted(true);
    navigate(hasSeenOnboarding ? ROUTES.login : ROUTES.onboarding, { replace: true });
  };

  if (!accepted) {
    return (
      <main className="c-desktop-device-shell c-desktop-device-shell--gate" aria-labelledby="desktop-device-title">
        <section className="c-desktop-device-shell__gate-content">
          <div className="c-desktop-device-shell__gate-copy">
            <h1 id="desktop-device-title">
              <span className="c-desktop-device-shell__accent">Blíster</span>{' '}
              se usa mejor en tu dispositivo móvil
              <span className="c-desktop-device-shell__asterisk">*</span>
            </h1>
            <p>
              Hemos preparado esta vista para que puedas probar la experiencia móvil desde tu ordenador.
            </p>
            <button type="button" className="c-btn c-btn--primary" onClick={handleUseHere}>
              <span>Usar aquí</span>
            </button>
          </div>
          <div className="c-desktop-device-shell__mockup" aria-hidden="true">
            <div className="c-desktop-device-shell__device c-desktop-device-shell__device--preview">
              <span className="c-desktop-device-shell__notch" />
              <span className="c-desktop-device-shell__speaker" />
              <span className="c-desktop-device-shell__camera" />
              <div className="c-desktop-device-shell__preview-screen" />
            </div>
          </div>
        </section>
        <p className="c-desktop-device-shell__footnote">
          <span className="c-desktop-device-shell__asterisk">*</span>
          Blíster también puede descargarse y utilizarse en PC y Mac.
        </p>
      </main>
    );
  }

  return (
    <div className="c-desktop-device-shell c-desktop-device-shell--app">
      <div className="c-desktop-device-shell__device" aria-label="Vista móvil simulada">
        <span className="c-desktop-device-shell__notch" aria-hidden="true" />
        <span className="c-desktop-device-shell__speaker" aria-hidden="true" />
        <span className="c-desktop-device-shell__camera" aria-hidden="true" />
        <div className="c-desktop-device-shell__screen">
          {children}
        </div>
      </div>
    </div>
  );
}
