import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TbChevronLeft, TbUserCircle, TbLock } from 'react-icons/tb';

import { loginSchema } from '../../../../shared/schemas/auth.schema';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ErrorState } from '../../components/atoms/ErrorState';
import { ROUTES } from '../../constants/routes';
import { applyUserSettings } from '../../lib/applyUserSettings';
import { login as loginService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './LoginPage.scss';

type LoginFormData = z.infer<typeof loginSchema>;

const getErrorMessage = (code: string | undefined): string => {
  switch (code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return 'Usuario o contraseña incorrectos. Verifique e intente nuevamente.';
    case 'VALIDATION_ERROR':
      return 'Datos inválidos. Verifique los campos.';
    default:
      return 'Ha ocurrido un error al iniciar sesión. Intente nuevamente.';
  }
};

function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const addToast = useUiStore((state) => state.addToast);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      const session = await loginService(data);
      applyUserSettings(session.user.settings);
      setSession(session);

      addToast({
        message: `¡Bienvenido, ${session.user.name}!`,
        variant: 'success',
      });

      navigate(ROUTES.blisters, { replace: true });
    } catch (error) {
      if (isApiError(error)) {
        setGlobalError(getErrorMessage(error.code));
      } else {
        setGlobalError('Ha ocurrido un error inesperado.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout className="c-login-page" innerClassName="c-login-page__inner">
      <header className="c-login-page__header">
        <button
          type="button"
          className="c-login-page__back-btn"
          onClick={() => navigate(ROUTES.landing)}
          aria-label="Volver a la portada"
        >
          <TbChevronLeft className="c-icon c-icon--md" aria-hidden="true" />
        </button>

        <h1 className="c-login-page__title">Iniciar Sesión</h1>

        <span className="c-login-page__spacer" aria-hidden="true" />
      </header>

      <form className="c-login-page__form" onSubmit={handleSubmit(onSubmit)}>
        {globalError ? <ErrorState message={globalError} /> : null}

        <Input
          label="Usuario o correo electrónico"
          placeholder="Nombre de usuario o correo"
          type="text"
          {...register('identifier')}
          error={errors.identifier?.message}
          icon={<TbUserCircle className="c-icon c-icon--md" aria-hidden="true" />}
        />

        <Input
          label="Contraseña"
          placeholder="••••••••"
          type="password"
          {...register('password')}
          error={errors.password?.message}
          icon={<TbLock className="c-icon c-icon--md" aria-hidden="true" />}
        />

        <Link to={ROUTES.forgotPassword} className="c-login-page__forgot-link">
          He olvidado mi contraseña
        </Link>

        <Button type="submit" variant="primary" fullWidth loading={isLoading} className="c-login-page__submit">
          Iniciar Sesión
        </Button>
      </form>

      <p className="c-login-page__footer">
        ¿No tienes una cuenta? <Link to={ROUTES.register} className="c-login-page__register-link">Regístrate</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;