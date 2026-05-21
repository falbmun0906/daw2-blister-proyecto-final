import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbTrash } from 'react-icons/tb';

import { DELETE_ACCOUNT_CONFIRMATION_PHRASE } from '../../../../shared/schemas/auth.schema';
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

function DeleteAccountPage() {
  usePageTitle('Eliminar cuenta');
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
    <section className="c-delete-account-page" aria-labelledby="delete-account-summary-title">
      <div className="c-delete-account-page__content">
        <span className="c-delete-account-page__eyebrow">Acción irreversible</span>
        <h2 id="delete-account-summary-title" className="c-delete-account-page__title">
          Antes de eliminar tu cuenta
        </h2>
        <p className="c-delete-account-page__lead">
          La cuenta asociada a {user.email} dejará de tener acceso a Blíster en cuanto confirmes la eliminación.
        </p>
        <ul className="c-delete-account-page__list">
          <li>Se cerrarán tus sesiones activas y se revocarán los tokens vinculados.</li>
          <li>Abandonarás los blísteres compartidos y se retirarán tus datos personales de esos espacios.</li>
          <li>Los blísteres en los que seas la única persona quedarán marcados para eliminación.</li>
        </ul>
        <p className="c-delete-account-page__note">
          Si continúas, el último paso seguirá requiriendo la frase de confirmación antes de completar el borrado.
        </p>
      </div>

      <div className="c-delete-account-page__actions">
        <Button
          type="button"
          variant="danger"
          fullWidth
          onClick={() => setDeleteModalOpen(true)}
        >
          Continuar con la eliminación
        </Button>
      </div>

      <Modal
        open={deleteModalOpen}
        title="Eliminar cuenta"
        onClose={closeDeleteModal}
        ariaLabel="Eliminar cuenta"
        headerIcon={(
          <span className="c-delete-account-page__modal-icon" aria-hidden="true">
            <TbTrash />
          </span>
        )}
        disableBackdropClose={isDeleting}
      >
        <div className="c-delete-account-page__modal">
          <p className="c-delete-account-page__modal-warning">
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
          <div className="c-delete-account-page__modal-actions">
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

export default DeleteAccountPage;