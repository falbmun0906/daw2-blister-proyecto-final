import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TbChevronRight, TbTrash } from 'react-icons/tb';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/atoms/Modal';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { unsubscribeFromServerPush } from '../../lib/push-notifications';
import { deleteAccount } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { resetAppStores } from '../../stores/reset-stores';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import { DELETE_ACCOUNT_CONFIRMATION_PHRASE } from '../../../../shared/schemas/auth.schema';

interface EditLink {
  to: string;
  label: string;
}

const EDIT_LINKS: EditLink[] = [
  { to: ROUTES.personalInfo, label: 'Información personal' },
  { to: ROUTES.changePassword, label: 'Cambiar contraseña' },
];

function EditProfilePage() {
  usePageTitle('Editar perfil');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const addToast = useUiStore((s) => s.addToast);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeDeleteModal = (): void => {
    if (isDeleting) return;
    setDeleteModalOpen(false);
    setDeleteConfirmation('');
    setDeleteError(null);
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setDeleteError(null);

      if (deleteConfirmation !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
        setDeleteError(`Escribe "${DELETE_ACCOUNT_CONFIRMATION_PHRASE}" para confirmar.`);
      return;
    }

    setIsDeleting(true);
    try {
      await unsubscribeFromServerPush().catch(() => undefined);
      await deleteAccount({ confirmation: deleteConfirmation });
      resetAppStores();
      clearSession();
      navigate(ROUTES.login, { replace: true });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar la cuenta.',
        variant: 'error',
      });
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <section className="c-edit-profile-page" aria-labelledby="edit-profile-title">
      <header className="c-edit-profile-page__identity">
        <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="lg" />
        <h1 id="edit-profile-title" className="c-edit-profile-page__name">{user.name}</h1>
        <p className="c-edit-profile-page__email">{user.email}</p>
        {user.pendingEmail && (
          <p className="c-edit-profile-page__pending-email">
            Pendiente de confirmar: {user.pendingEmail}
          </p>
        )}
      </header>

      <nav className="c-edit-profile-page__menu" aria-label="Opciones de edición">
        {EDIT_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="c-edit-profile-page__menu-item">
            <span className="c-edit-profile-page__menu-label">{item.label}</span>
            <TbChevronRight
              className="c-icon c-icon--md c-edit-profile-page__menu-chevron"
              aria-hidden="true"
            />
          </Link>
        ))}
        <button
          type="button"
          className="c-edit-profile-page__menu-item c-edit-profile-page__menu-item--danger"
          onClick={() => setDeleteModalOpen(true)}
        >
          <span className="c-edit-profile-page__menu-label">Eliminar cuenta</span>
          <TbChevronRight
            className="c-icon c-icon--md c-edit-profile-page__menu-chevron"
            aria-hidden="true"
          />
        </button>
      </nav>

      <Modal
        open={deleteModalOpen}
        title="Eliminar cuenta"
        onClose={closeDeleteModal}
        ariaLabel="Eliminar cuenta"
        headerIcon={(
          <span className="c-edit-profile-page__delete-icon" aria-hidden="true">
            <TbTrash />
          </span>
        )}
        disableBackdropClose={isDeleting}
      >
        <div className="c-edit-profile-page__delete-modal">
          <p className="c-edit-profile-page__delete-warning">
            Se cerrarán tus sesiones, se revocarán tus tokens y abandonarás los blísteres compartidos. Los blísteres en los que seas la única persona quedarán marcados para eliminación. No hay vuelta atrás.
          </p>
          <Input
            label="Confirmación"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            disabled={isDeleting}
            autoComplete="off"
            hint={`Escribe '${DELETE_ACCOUNT_CONFIRMATION_PHRASE}' para confirmar.`}
            error={deleteError ?? undefined}
          />
          <div className="c-edit-profile-page__delete-actions">
            <Button type="button" variant="primary-outline" onClick={closeDeleteModal} disabled={isDeleting}>
              Conservar cuenta
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={isDeleting}
              disabled={deleteConfirmation !== DELETE_ACCOUNT_CONFIRMATION_PHRASE}
              onClick={() => void handleDeleteAccount()}
            >
              Eliminar cuenta
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default EditProfilePage;
