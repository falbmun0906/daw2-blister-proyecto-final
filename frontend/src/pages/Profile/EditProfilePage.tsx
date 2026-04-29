import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ROUTES } from '../../constants/routes';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './EditProfilePage.scss';

const editProfileFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Debe tener al menos 3 caracteres.')
    .max(50, 'Máximo 50 caracteres.')
    .regex(/^[a-z0-9._-]+$/u, 'Solo se permiten letras minúsculas, números, puntos, guiones y guion bajo.'),
  email: z.string().trim().toLowerCase().email('Correo electrónico no válido.'),
});

type EditProfileFormValues = z.infer<typeof editProfileFormSchema>;

function EditProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileFormSchema),
    defaultValues: {
      name: user?.name ?? '',
      username: user?.username ?? '',
      email: user?.email ?? '',
    },
  });

  if (!user) return null;

  const onSubmit = async (values: EditProfileFormValues): Promise<void> => {
    const payload: Partial<EditProfileFormValues> = {};
    if (values.name !== user.name) payload.name = values.name;
    if (values.username !== user.username) payload.username = values.username;
    if (values.email !== user.email) payload.email = values.email;

    if (Object.keys(payload).length === 0) {
      addToast({ message: 'No has cambiado ningún dato.', variant: 'info' });
      return;
    }

    try {
      const updated = await updateProfile(payload);
      updateUser(updated);
      addToast({ message: 'Perfil actualizado correctamente.', variant: 'success' });
      navigate(ROUTES.profile);
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === 'AUTH_EMAIL_CONFLICT') {
          setError('email', { type: 'server', message: 'Este correo ya está en uso.' });
          return;
        }
        if (err.code === 'AUTH_USERNAME_CONFLICT') {
          setError('username', { type: 'server', message: 'Este usuario ya está en uso.' });
          return;
        }
        addToast({ message: err.message, variant: 'error' });
        return;
      }
      addToast({ message: 'No se ha podido guardar el perfil.', variant: 'error' });
    }
  };

  return (
    <section className="c-edit-profile-page" aria-labelledby="edit-profile-title">
      <header className="c-edit-profile-page__header">
        <h1 id="edit-profile-title" className="c-edit-profile-page__title">Editar datos</h1>
      </header>

      <form className="c-edit-profile-page__form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Nombre"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Nombre de usuario"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="c-edit-profile-page__actions">
          <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.profile)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </section>
  );
}

export default EditProfilePage;
