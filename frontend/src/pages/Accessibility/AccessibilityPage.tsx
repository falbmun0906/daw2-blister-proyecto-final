import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FontSelector } from '../../components/molecules/FontSelector';
import { TextSizeSelector } from '../../components/molecules/TextSizeSelector';
import { ThemeSelector } from '../../components/molecules/ThemeSelector';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { applyUserSettings } from '../../lib/applyUserSettings';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { UserSettings } from '../../types/auth.types';
import './AccessibilityPage.scss';

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

  useEffect(() => {
    if (draft) applyUserSettings(draft);
  }, [draft]);

  // Restaurar las preferencias persistidas si el usuario abandona sin guardar.
  useEffect(() => {
    return () => {
      if (user) applyUserSettings(user.settings);
    };
  }, [user]);

  if (!user || !draft) return null;

  const persist = async (
    next: Pick<UserSettings, 'theme' | 'font' | 'fontSize'>,
  ): Promise<void> => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({ settings: next });
      updateUser(updated);
      applyUserSettings(updated.settings);
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : 'No se han podido guardar las preferencias.';
      addToast({ message, variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (patch: Partial<UserSettings>): void => {
    const next = { ...draft, ...patch };
    setDraft(next);
    void persist({ theme: next.theme, font: next.font, fontSize: next.fontSize });
  };

  const handleReset = (): void => {
    setDraft({ ...draft, ...DEFAULT_SETTINGS });
    void persist(DEFAULT_SETTINGS);
    addToast({ message: 'Ajustes restablecidos.', variant: 'info' });
    navigate(ROUTES.profile);
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
    </section>
  );
}

export default AccessibilityPage;
