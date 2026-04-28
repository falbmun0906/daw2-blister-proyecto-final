import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { registerSchema } from '../../../../shared/schemas/auth.schema';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ErrorState } from '../../components/atoms/ErrorState';
import { ROUTES } from '../../constants/routes';
import { applyUserSettings } from '../../lib/applyUserSettings';
import { register as registerService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './RegisterPage.scss';

type RegisterFormData = z.infer<typeof registerSchema>;

type RegisterFormValues = Omit<RegisterFormData, 'privacyConsent' | 'ageConfirmed'> & {
  privacyConsent: boolean;
  ageConfirmed: boolean;
};

const getErrorMessage = (code: string | undefined): string => {
  switch (code) {
    case 'AUTH_EMAIL_CONFLICT':
      return 'Este correo electrónico ya está registrado.';
    case 'AUTH_USERNAME_CONFLICT':
      return 'Este nombre de usuario ya está en uso.';
    case 'AUTH_INVITE_INVALID':
      return 'El código de invitación es inválido o ha expirado.';
    case 'VALIDATION_ERROR':
      return 'Datos inválidos. Verifique los campos.';
    default:
      return 'Ha ocurrido un error al crear la cuenta. Intente nuevamente.';
  }
};

function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const addToast = useUiStore((state) => state.addToast);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      privacyConsent: false,
      ageConfirmed: false,
      inviteCode: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      const session = await registerService(data as RegisterFormData);
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
    <AuthLayout className="c-register-page" tone="brand" innerClassName="c-register-page__inner">
      <header className="c-register-page__header">
        <button
          type="button"
          className="c-register-page__back-btn"
          onClick={() => navigate(ROUTES.landing)}
          aria-label="Volver a la portada"
        >
          <svg viewBox="0 0 24 24" className="c-register-page__back-icon" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h1 className="c-register-page__title">Crear Cuenta</h1>

        <span className="c-register-page__spacer" aria-hidden="true" />
      </header>

      {globalError ? <ErrorState message={globalError} /> : null}

      <form className="c-register-page__form" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Nombre completo *"
          placeholder="Tu nombre completo"
          type="text"
          {...register('name')}
          error={errors.name?.message}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" fill="currentColor" />
              <path d="M12 14c-4 0-6 2-6 2v2h12v-2s-2-2-6-2z" fill="currentColor" />
            </svg>
          }
        />

        <Input
          label="Nombre de usuario *"
          placeholder="nombre_usuario"
          type="text"
          {...register('username')}
          error={errors.username?.message}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />

        <Input
          label="Correo electrónico *"
          placeholder="tu@correo.com"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M2 6l10 8 10-8" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />

        <Input
          label="Contraseña *"
          placeholder="••••••••"
          type="password"
          {...register('password')}
          error={errors.password?.message}
          hint="Mínimo 8 caracteres: mayúscula, minúscula, número y símbolo"
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="12" width="16" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M8 12v-3a4 4 0 018 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />

        <Input
          label="Confirmar contraseña *"
          placeholder="••••••••"
          type="password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />

        <Input
          label="Código de invitación (opcional)"
          placeholder="ABC12345"
          type="text"
          {...register('inviteCode')}
          error={errors.inviteCode?.message}
          hint="Comparte tu botiquín con la familia"
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2 12c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10S2 17.5 2 12z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />

        <div className="c-register-page__checkboxes">
          <label className="c-register-page__checkbox-label">
            <input
              type="checkbox"
              {...register('privacyConsent')}
              className="c-register-page__checkbox-input"
            />
            <span className="c-register-page__checkbox-text">
              Acepto la <a href="#privacy" className="c-register-page__link">política de privacidad</a> *
            </span>
          </label>

          <label className="c-register-page__checkbox-label">
            <input
              type="checkbox"
              {...register('ageConfirmed')}
              className="c-register-page__checkbox-input"
            />
            <span className="c-register-page__checkbox-text">Confirmo que tengo 18 años o más *</span>
          </label>

          {(errors.privacyConsent || errors.ageConfirmed) && (
            <p className="c-register-page__error-message">
              {errors.privacyConsent?.message || errors.ageConfirmed?.message}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" fullWidth loading={isLoading} className="c-register-page__submit">
          Crear Cuenta
        </Button>
      </form>

      <p className="c-register-page__footer">
        ¿Ya tienes una cuenta? <Link to={ROUTES.login} className="c-register-page__login-link">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;