import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { Modal } from '../../components/atoms/Modal';
import { AvatarSelector } from '../../components/molecules/AvatarSelector';
import { ROUTES } from '../../constants/routes';
import { usePageBackOverride, usePageTitle } from '../../hooks/use.page-title';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

function AvatarPage() {
  usePageTitle('Avatar');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | undefined>(user?.settings.avatarKey);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const hasUnsavedChanges = useMemo(
    () => selected !== user?.settings.avatarKey,
    [selected, user?.settings.avatarKey],
  );

  const leavePage = useCallback(() => {
    navigate(ROUTES.personalInfo);
  }, [navigate]);

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      return;
    }
    leavePage();
  }, [hasUnsavedChanges, leavePage]);

  usePageBackOverride(handleBack);

  if (!user) return null;

  const handleSave = async (): Promise<void> => {
    if (!selected || selected === user.settings.avatarKey) {
      addToast({ message: 'No has cambiado el avatar.', variant: 'info' });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateProfile({ settings: { avatarKey: selected } });
      updateUser(updated);
      addToast({ message: 'Avatar actualizado.', variant: 'success' });
      navigate(ROUTES.personalInfo);
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido guardar el avatar.';
      addToast({ message, variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="c-avatar-page" aria-labelledby="avatar-title">
      <header className="c-avatar-page__header">
        <h1 id="avatar-title" className="c-avatar-page__title">Cambiar avatar</h1>
      </header>

      <div className="c-avatar-page__preview">
        <Avatar name={user.name} avatarKey={selected} size="lg" />
      </div>

      <AvatarSelector currentAvatarKey={selected} onSelect={setSelected} />

      <div className="c-avatar-page__actions">
        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={isSaving}
          onClick={() => void handleSave()}
        >
          Guardar avatar
        </Button>
      </div>

      <Modal
        open={showUnsavedModal}
        title="Cambios sin guardar"
        onClose={() => setShowUnsavedModal(false)}
      >
        <div className="c-avatar-page__unsaved">
          <p>Has cambiado el avatar, pero todavía no lo has guardado.</p>
          <div className="c-avatar-page__unsaved-actions">
            <Button type="button" variant="primary-outline" onClick={() => setShowUnsavedModal(false)}>
              Seguir editando
            </Button>
            <Button type="button" variant="danger" onClick={leavePage}>
              Salir sin guardar
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default AvatarPage;
