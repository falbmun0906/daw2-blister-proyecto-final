import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { TbUserCircle, TbLock } from 'react-icons/tb';

import { loginSchema } from '../../../../shared/schemas/auth.schema';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ErrorState } from '../../components/atoms/ErrorState';
import { ROUTES } from '../../constants/routes';
import { applyUserSettings } from '../../lib/applyUserSettings';
import { createZodFormResolver } from '../../lib/zod-form-resolver';
import { login as loginService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { resetAppStores } from '../../stores/reset-stores';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

type LoginFormData = z.infer<typeof loginSchema>;

const REMEMBER_IDENTIFIER_KEY = 'blister-login-identifier';

const readRememberedIdentifier = (): string => {
  try {
    return globalThis.localStorage?.getItem(REMEMBER_IDENTIFIER_KEY) ?? '';
  } catch {
    return '';
  }
};

const writeRememberedIdentifier = (identifier: string): void => {
  try {
    if (identifier) {
      globalThis.localStorage?.setItem(REMEMBER_IDENTIFIER_KEY, identifier);
      return;
    }
    globalThis.localStorage?.removeItem(REMEMBER_IDENTIFIER_KEY);
  } catch {
    // The login flow remains functional when browser storage is unavailable.
  }
};

const getErrorMessage = (code: string | undefined): string => {
  switch (code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return 'Usuario o contraseña incorrectos. Verifique e intente nuevamente.';
    case 'AUTH_EMAIL_NOT_VERIFIED':
      return 'Confirma tu correo electrónico antes de iniciar sesión. Revisa también la carpeta de spam.';
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
  const clearToasts = useUiStore((state) => state.clearToasts);
  const [rememberIdentifier, setRememberIdentifier] = useState(() => readRememberedIdentifier().length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const rememberedIdentifier = readRememberedIdentifier();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: createZodFormResolver(loginSchema),
    defaultValues: {
      identifier: rememberedIdentifier,
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      const session = await loginService(data);
      // Limpiar datos persistidos de un posible usuario anterior.
      const previousUserId = useAuthStore.getState().user?.id ?? null;
      if (previousUserId !== session.user.id) {
        resetAppStores();
      }
      applyUserSettings(session.user.settings);
      writeRememberedIdentifier(rememberIdentifier ? data.identifier : '');
      setSession(session);
      clearToasts();

      addToast({
        message: `¡Bienvenido, ${session.user.name}!`,
        variant: 'success',
      });

      navigate(ROUTES.home, { replace: true });
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
      <div className="c-login-page__body">
        <h1 className="c-login-page__title">
          <span className="c-login-page__title-accent">Iniciar</span> sesión
        </h1>

        <form className="c-login-page__form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {globalError ? <ErrorState message={globalError} /> : null}

          <Input
            label="Usuario o correo electrónico"
            placeholder="usuario o correo@dominio.com"
            type="text"
            autoComplete="username"
            {...register('identifier')}
            error={errors.identifier?.message}
            icon={<TbUserCircle className="c-icon c-icon--md" aria-hidden="true" />}
          />

          <Input
            label="Contraseña"
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
            icon={<TbLock className="c-icon c-icon--md" aria-hidden="true" />}
          />

          <div className="c-login-page__options">
            <label className="c-login-page__remember-label">
              <input
                type="checkbox"
                className="c-login-page__remember-input"
                checked={rememberIdentifier}
                onChange={(event) => setRememberIdentifier(event.target.checked)}
              />
              <span>Recordarme</span>
            </label>

            <Link to={ROUTES.forgotPassword} className="c-login-page__forgot-link">
              He olvidado mi contraseña
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={isLoading} className="c-login-page__submit">
            Iniciar sesión
          </Button>
        </form>
      </div>

      <p className="c-login-page__footer">
        ¿No tienes una cuenta? <Link to={ROUTES.register} className="c-login-page__register-link">Regístrate</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
