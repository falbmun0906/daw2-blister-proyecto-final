import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
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

  const updateDraft = (patch: Partial<UserSettings>): void => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const hasChanges =
    draft.theme !== user.settings.theme ||
    draft.font !== user.settings.font ||
    draft.fontSize !== user.settings.fontSize;

  const handleCancel = (): void => {
    applyUserSettings(user.settings);
    navigate(ROUTES.profile);
  };

  const handleSave = async (): Promise<void> => {
    if (!hasChanges) {
      addToast({ message: 'No has cambiado ningún ajuste.', variant: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        settings: {
          theme: draft.theme,
          font: draft.font,
          fontSize: draft.fontSize,
        },
      });
      updateUser(updated);
      applyUserSettings(updated.settings);
      addToast({ message: 'Preferencias guardadas.', variant: 'success' });
      navigate(ROUTES.profile);
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : 'No se han podido guardar las preferencias.';
      addToast({ message, variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="c-accessibility-page" aria-labelledby="accessibility-title">
      <header className="c-accessibility-page__header">
        <h1 id="accessibility-title" className="c-accessibility-page__title">
          Accesibilidad
        </h1>
        <p className="c-accessibility-page__description">
          Los cambios se previsualizan al instante. Pulsa Guardar para conservarlos.
        </p>
      </header>

      <fieldset className="c-accessibility-page__group">
        <legend className="c-accessibility-page__legend">Tema</legend>
        <ThemeSelector
          currentTheme={draft.theme}
          onChange={(theme) => updateDraft({ theme })}
        />
      </fieldset>

      <fieldset className="c-accessibility-page__group">
        <legend className="c-accessibility-page__legend">Tipografía</legend>
        <FontSelector
          currentFont={draft.font}
          onChange={(font) => updateDraft({ font })}
        />
      </fieldset>

      <fieldset className="c-accessibility-page__group">
        <legend className="c-accessibility-page__legend">Tamaño del texto</legend>
        <TextSizeSelector
          currentSize={draft.fontSize}
          onChange={(fontSize) => updateDraft({ fontSize })}
        />
      </fieldset>

      <div className="c-accessibility-page__actions">
        <Button type="button" variant="ghost" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={isSaving}
          onClick={() => void handleSave()}
        >
          Guardar preferencias
        </Button>
      </div>
    </section>
  );
}

export default AccessibilityPage;
