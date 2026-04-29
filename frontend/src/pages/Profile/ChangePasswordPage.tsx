import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { updateProfile } from '../../services/auth.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './ChangePasswordPage.scss';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, 'Introduce tu contraseña actual.'),
    newPassword: z
      .string()
      .trim()
      .min(8, 'Debe tener al menos 8 caracteres.')
      .regex(/[A-Z]/u, 'Debe incluir una mayúscula.')
      .regex(/[a-z]/u, 'Debe incluir una minúscula.')
      .regex(/\d/u, 'Debe incluir un número.')
      .regex(/[^\w\s]/u, 'Debe incluir un símbolo.'),
    confirmNewPassword: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewPassword'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordPage() {
  usePageTitle('Cambiar contraseña');
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (values: ChangePasswordFormValues): Promise<void> => {
    try {
      await updateProfile({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      addToast({ message: 'Contraseña actualizada correctamente.', variant: 'success' });
      navigate(ROUTES.profile);
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === 'AUTH_CURRENT_PASSWORD_INVALID') {
          setError('currentPassword', {
            type: 'server',
            message: 'La contraseña actual no es correcta.',
          });
          return;
        }
        addToast({ message: err.message, variant: 'error' });
        return;
      }
      addToast({ message: 'No se ha podido cambiar la contraseña.', variant: 'error' });
    }
  };

  return (
    <section className="c-change-password-page" aria-labelledby="change-password-title">
      <header className="c-change-password-page__header">
        <h1 id="change-password-title" className="c-change-password-page__title">
          Cambiar contraseña
        </h1>
      </header>

      <form
        className="c-change-password-page__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Input
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label="Confirmar nueva contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmNewPassword?.message}
          {...register('confirmNewPassword')}
        />

        <div className="c-change-password-page__actions">
          <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.profile)}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Guardar contraseña
          </Button>
        </div>
      </form>
    </section>
  );
}

export default ChangePasswordPage;
