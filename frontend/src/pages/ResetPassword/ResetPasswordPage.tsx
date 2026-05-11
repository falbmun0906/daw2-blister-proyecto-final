import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaArrowLeft } from 'react-icons/fa6';
import { TbLock } from 'react-icons/tb';

import { resetPasswordSchema } from '../../../../shared/schemas/auth.schema';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Input } from '../../components/atoms/Input';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { ROUTES } from '../../constants/routes';
import { resetPassword } from '../../services/auth.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './ResetPasswordPage.scss';

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const getResetErrorMessage = (code: string | undefined): string => {
  switch (code) {
    case 'AUTH_PASSWORD_RESET_TOKEN_EXPIRED':
      return 'El enlace ha caducado. Solicita uno nuevo para continuar.';
    case 'AUTH_PASSWORD_RESET_TOKEN_INVALID':
      return 'El enlace no es válido o ya se ha usado.';
    case 'VALIDATION_ERROR':
      return 'La contraseña no cumple los requisitos.';
    default:
      return 'No hemos podido actualizar la contraseña. Inténtalo de nuevo.';
  }
};

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToast = useUiStore((state) => state.addToast);
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(token ? null : 'Falta el token de recuperación.');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      await resetPassword({ ...data, token });
      addToast({
        message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
        variant: 'success',
      });
      setIsCompleted(true);
    } catch (error) {
      setGlobalError(isApiError(error) ? getResetErrorMessage(error.code) : getResetErrorMessage(undefined));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout className="c-reset-password-page" innerClassName="c-reset-password-page__inner">
      <header className="c-reset-password-page__header">
        <button
          type="button"
          className="c-reset-password-page__back-btn"
          onClick={() => navigate(ROUTES.login)}
          aria-label="Volver al inicio de sesión"
        >
          <FaArrowLeft className="c-icon c-icon--md" aria-hidden="true" />
        </button>
        <span className="c-reset-password-page__spacer" aria-hidden="true" />
      </header>

      <h1 className="c-reset-password-page__title">
        <span className="c-reset-password-page__title-accent">Nueva</span> contraseña
      </h1>

      {isCompleted ? (
        <div className="c-reset-password-page__state">
          <EmptyState
            title="Todo listo"
            description="Tu contraseña se ha actualizado correctamente."
          />
          <Link to={ROUTES.login} className="c-reset-password-page__return-link">
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <form className="c-reset-password-page__form" onSubmit={handleSubmit(onSubmit)}>
          {globalError ? <ErrorState message={globalError} /> : null}
          <input type="hidden" {...register('token')} value={token} />

          <Input
            label="Nueva contraseña"
            placeholder="********"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
            icon={<TbLock className="c-icon c-icon--md" aria-hidden="true" />}
          />

          <Input
            label="Repite la contraseña"
            placeholder="********"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            icon={<TbLock className="c-icon c-icon--md" aria-hidden="true" />}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={!token}
            className="c-reset-password-page__submit"
          >
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default ResetPasswordPage;
