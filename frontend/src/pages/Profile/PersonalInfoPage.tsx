import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { TbPencil } from 'react-icons/tb';
import { z } from 'zod';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/atoms/Modal';
import { ROUTES } from '../../constants/routes';
import { usePageBackOverride, usePageTitle } from '../../hooks/use.page-title';
import { createZodFormResolver } from '../../lib/zod-form-resolver';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

const personalInfoSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(100, 'El nombre no puede superar los 100 caracteres.'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Debe tener al menos 3 caracteres.')
    .max(50, 'Máximo 50 caracteres.')
    .regex(
      /^[a-z0-9._-]+$/u,
      'Solo se permiten letras minúsculas, números, puntos, guiones y guion bajo.',
    ),
  email: z.string().trim().toLowerCase().email('Correo electrónico no válido.'),
});

type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;

function PersonalInfoPage() {
  usePageTitle('Información personal');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const editableEmail = user?.pendingEmail ?? user?.email ?? '';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PersonalInfoFormValues>({
    resolver: createZodFormResolver(personalInfoSchema),
    defaultValues: {
      name: user?.name ?? '',
      username: user?.username ?? '',
      email: editableEmail,
    },
  });

  const leavePage = useCallback((route: string): void => {
    navigate(route);
  }, [navigate]);

  const requestLeave = useCallback((route: string = ROUTES.editProfile): void => {
    if (isDirty) {
      setPendingRoute(route);
      setShowUnsavedModal(true);
      return;
    }
    leavePage(route);
  }, [isDirty, leavePage]);

  const handleBack = useCallback(() => {
    requestLeave(ROUTES.editProfile);
  }, [requestLeave]);

  usePageBackOverride(handleBack);

  if (!user) return null;

  const onSubmit = async (values: PersonalInfoFormValues): Promise<void> => {
    const payload: Partial<PersonalInfoFormValues> = {};
    if (values.name !== user.name) payload.name = values.name;
    if (values.username !== user.username) payload.username = values.username;
    if (values.email !== editableEmail) payload.email = values.email;

    if (Object.keys(payload).length === 0) {
      addToast({ message: 'No has cambiado ningún dato.', variant: 'info' });
      return;
    }

    try {
      const updated = await updateProfile(payload);
      updateUser(updated);
      addToast({
        message: payload.email
          ? 'Te hemos enviado un correo para confirmar la nueva dirección.'
          : 'Perfil actualizado correctamente.',
        variant: 'success',
      });
      navigate(ROUTES.editProfile);
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === 'AUTH_EMAIL_CONFLICT') {
          setError('email', { type: 'server', message: 'Este correo ya está en uso.' });
          return;
        }
        if (err.code === 'AUTH_USERNAME_CONFLICT') {
          setError('username', {
            type: 'server',
            message: 'Este usuario ya está en uso.',
          });
          return;
        }
        addToast({ message: err.message, variant: 'error' });
        return;
      }
      addToast({ message: 'No se ha podido guardar el perfil.', variant: 'error' });
    }
  };

  return (
    <section className="c-personal-info-page">
      <div className="c-personal-info-page__avatar">
        <Avatar name={user.name} avatarKey={user.settings.avatarKey} size="lg" />
        <Link
          to={ROUTES.profileAvatar}
          className="c-personal-info-page__avatar-edit"
          aria-label="Cambiar avatar"
          onClick={(event) => {
            if (!isDirty) return;
            event.preventDefault();
            requestLeave(ROUTES.profileAvatar);
          }}
        >
          <TbPencil className="c-icon c-icon--sm" aria-hidden="true" />
        </Link>
      </div>

      <form
        className="c-personal-info-page__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Input
          label="Nombre completo"
          autoComplete="name"
          placeholder="Francisco Alba Muñoz"
          error={errors.name?.message}
          wrapperClassName="c-field--pill"
          {...register('name')}
        />
        <Input
          label="Usuario"
          autoComplete="username"
          placeholder="franalba21"
          error={errors.username?.message}
          wrapperClassName="c-field--pill"
          {...register('username')}
        />
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="fran.alba.munoz@ejemplo.com"
          error={errors.email?.message}
          wrapperClassName="c-field--pill"
          {...register('email')}
        />
        {user.pendingEmail && (
          <p className="c-personal-info-page__pending-email">
            Pendiente de confirmar: {user.pendingEmail}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          className="c-personal-info-page__submit"
        >
          Guardar cambios
        </Button>
      </form>

      <Modal
        open={showUnsavedModal}
        title="Cambios sin guardar"
        onClose={() => setShowUnsavedModal(false)}
      >
        <div className="c-personal-info-page__unsaved">
          <p>Has cambiado tu información personal, pero todavía no la has guardado.</p>
          <div className="c-personal-info-page__unsaved-actions">
            <Button type="button" variant="primary-outline" onClick={() => setShowUnsavedModal(false)}>
              Seguir editando
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => leavePage(pendingRoute ?? ROUTES.editProfile)}
            >
              Salir sin guardar
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default PersonalInfoPage;
