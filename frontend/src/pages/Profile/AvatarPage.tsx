import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { AvatarSelector } from '../../components/molecules/AvatarSelector';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './AvatarPage.scss';

function AvatarPage() {
  usePageTitle('Avatar');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | undefined>(user?.settings.avatarKey);
  const [isSaving, setIsSaving] = useState(false);

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
      navigate(ROUTES.profile);
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
        <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.profile)}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" loading={isSaving} onClick={() => void handleSave()}>
          Guardar avatar
        </Button>
      </div>
    </section>
  );
}

export default AvatarPage;
