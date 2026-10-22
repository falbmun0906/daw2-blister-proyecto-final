import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { Modal } from '../../components/atoms/Modal';
import { FontSelector } from '../../components/molecules/FontSelector';
import { TextSizeSelector } from '../../components/molecules/TextSizeSelector';
import { ThemeSelector } from '../../components/molecules/ThemeSelector';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { captureRequestContext } from '../../lib/request-context';
import { applyUserSettings } from '../../lib/applyUserSettings';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { UserSettings } from '../../types/auth.types';

const DEFAULT_SETTINGS: Pick<UserSettings, 'theme' | 'font' | 'fontSize'> = {
  theme: 'system',
  font: 'standard',
  fontSize: 'normal',
};

function AccessibilityPage() {
  usePageTitle('Accesibilidad');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();

  const [draft, setDraft] = useState<UserSettings | null>(user?.settings ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const draftRef = useRef(draft);
  const confirmedUser = useRef(user);
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const revision = useRef(0);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    if (draft) applyUserSettings(draft);
  }, [draft]);

  if (!user || !draft) return null;

  const persist = (
    next: Pick<UserSettings, 'theme' | 'font' | 'fontSize'>,
  ): Promise<boolean> => {
    const currentRevision = ++revision.current;
    const isCurrentSession = captureRequestContext(undefined, false);
    setIsSaving(true);
    const operation = saveQueue.current.then(async () => {
      if (!isCurrentSession()) return false;
      try {
        const updated = await updateProfile({ settings: next });
        if (!isCurrentSession()) return false;
        confirmedUser.current = updated;
        if (currentRevision === revision.current) {
          updateUser(updated);
          draftRef.current = updated.settings;
          setDraft(updated.settings);
        }
        return true;
      } catch (err) {
        if (isCurrentSession() && currentRevision === revision.current) {
          const confirmed = confirmedUser.current;
          if (confirmed) {
            updateUser(confirmed);
            draftRef.current = confirmed.settings;
            setDraft(confirmed.settings);
          }
          addToast({ message: isApiError(err) ? err.message : 'No se han podido guardar las preferencias.', variant: 'error' });
        }
        return false;
      } finally {
        if (currentRevision === revision.current) setIsSaving(false);
      }
    });
    saveQueue.current = operation;
    return operation;
  };

  const handleChange = (patch: Partial<UserSettings>): void => {
    const next = { ...(draftRef.current ?? draft), ...patch };
    draftRef.current = next;
    setDraft(next);
    void persist({ theme: next.theme, font: next.font, fontSize: next.fontSize });
  };

  const handleReset = (): void => {
    setIsResetModalOpen(true);
  };

  const confirmReset = async (): Promise<void> => {
    setIsResetModalOpen(false);
    const next = { ...(draftRef.current ?? draft), ...DEFAULT_SETTINGS };
    draftRef.current = next;
    setDraft(next);
    const saved = await persist(DEFAULT_SETTINGS);
    if (saved) {
      addToast({ message: 'Ajustes restablecidos.', variant: 'info' });
      navigate(ROUTES.profile);
    }
  };

  return (
    <section className="c-accessibility-page" aria-label="Ajustes de accesibilidad">
      <h2 className="c-accessibility-page__section-title">Vista</h2>
      <div className="c-accessibility-page__row">
        <p className="c-accessibility-page__row-label">Modo de pantalla</p>
        <ThemeSelector
          currentTheme={draft.theme}
          onChange={(theme) => handleChange({ theme })}
        />
      </div>

      <h2 className="c-accessibility-page__section-title">Tipografía</h2>
      <div className="c-accessibility-page__row">
        <p className="c-accessibility-page__row-label">Tamaño del texto</p>
        <TextSizeSelector
          currentSize={draft.fontSize}
          onChange={(fontSize) => handleChange({ fontSize })}
        />
      </div>
      <div className="c-accessibility-page__row">
        <FontSelector
          currentFont={draft.font}
          onChange={(font) => handleChange({ font })}
        />
      </div>

      <button
        type="button"
        className="c-accessibility-page__reset"
        onClick={handleReset}
        disabled={isSaving}
      >
        Restablecer ajustes básicos
      </button>

      <Modal
        open={isResetModalOpen}
        title="Restablecer ajustes"
        onClose={() => setIsResetModalOpen(false)}
      >
        <p className="c-accessibility-page__modal-text">
          Se volverá al modo de pantalla del sistema, la tipografía estándar y el tamaño de texto normal.
        </p>
        <div className="c-accessibility-page__modal-actions">
          <Button
            type="button"
            variant="primary-outline"
            onClick={() => setIsResetModalOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={isSaving}
            onClick={() => void confirmReset()}
          >
            Restablecer
          </Button>
        </div>
      </Modal>
    </section>
  );
}

export default AccessibilityPage;
