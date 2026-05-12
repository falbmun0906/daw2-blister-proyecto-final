import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { TbLock, TbShieldLock } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { FormSection } from '../../components/molecules/FormSection';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { updateProfile } from '../../services/auth.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

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
    <section className="c-change-password-page">
      <form
        className="c-change-password-page__form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormSection label="Verificación" icon={<TbLock />}>
          <Input
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            placeholder="**********"
            error={errors.currentPassword?.message}
            wrapperClassName="c-field--pill"
            {...register('currentPassword')}
          />
        </FormSection>

        <FormSection
          label="Nueva contraseña"
          hint="Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo."
          icon={<TbShieldLock />}
        >
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="**********"
            error={errors.newPassword?.message}
            wrapperClassName="c-field--pill"
            {...register('newPassword')}
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="**********"
            error={errors.confirmNewPassword?.message}
            wrapperClassName="c-field--pill"
            {...register('confirmNewPassword')}
          />
        </FormSection>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={isSubmitting}
          className="c-change-password-page__submit"
        >
          Guardar cambios
        </Button>
      </form>
    </section>
  );
}

export default ChangePasswordPage;
