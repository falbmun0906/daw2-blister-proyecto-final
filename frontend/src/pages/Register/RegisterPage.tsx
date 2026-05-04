import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FaArrowLeft } from 'react-icons/fa6';
import {
  TbUserCircle,
  TbUser,
  TbMail,
  TbLock,
  TbCheck,
  TbKey,
} from 'react-icons/tb';

import { registerSchema } from '../../../../shared/schemas/auth.schema';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { ErrorState } from '../../components/atoms/ErrorState';
import { InfoTooltip } from '../../components/atoms/InfoTooltip';
import { ROUTES } from '../../constants/routes';
import { applyUserSettings } from '../../lib/applyUserSettings';
import { register as registerService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { resetAppStores } from '../../stores/reset-stores';
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

const FIELD_ERROR_LABELS: Record<string, keyof RegisterFormValues> = {
  name: 'name',
  username: 'username',
  email: 'email',
  password: 'password',
  confirmPassword: 'confirmPassword',
  privacyConsent: 'privacyConsent',
  ageConfirmed: 'ageConfirmed',
  inviteCode: 'inviteCode',
};

const translateValidationMessage = (message: string): string => {
  const translations: Record<string, string> = {
    'Password must include an uppercase letter.': 'La contraseña debe incluir una mayúscula.',
    'Password must include a lowercase letter.': 'La contraseña debe incluir una minúscula.',
    'Password must include a number.': 'La contraseña debe incluir un número.',
    'Password must include a symbol.': 'La contraseña debe incluir un símbolo.',
    'Passwords do not match.': 'Las contraseñas no coinciden.',
    'Email must be valid.': 'Introduce un correo válido.',
    'Username contains invalid characters.': 'Solo minúsculas, números y . _ -.',
  };
  return translations[message] ?? message;
};

const getFieldError = (error: FieldError | undefined): string | undefined => {
  if (!error) return undefined;
  const messages = error.types
    ? Object.values(error.types).filter((value): value is string => typeof value === 'string')
    : [];
  if (messages.length > 0) return messages.map(translateValidationMessage).join(' ');
  return error.message ? translateValidationMessage(error.message) : undefined;
};

const applyApiFieldErrors = (
  details: unknown,
  setError: ReturnType<typeof useForm<RegisterFormValues>>['setError'],
): boolean => {
  if (!Array.isArray(details)) return false;
  let applied = false;
  for (const detail of details) {
    if (typeof detail !== 'string') continue;
    const [field, ...messageParts] = detail.split(': ');
    const fieldName = FIELD_ERROR_LABELS[field];
    if (!fieldName) continue;
    setError(fieldName, { type: 'server', message: translateValidationMessage(messageParts.join(': ')) });
    applied = true;
  }
  return applied;
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
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    criteriaMode: 'all',
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
      // El registro implica una nueva cuenta: descarta cualquier dato cacheado.
      resetAppStores();
      applyUserSettings(session.user.settings);
      setSession(session);

      addToast({
        message: `¡Bienvenido, ${session.user.name}!`,
        variant: 'success',
      });

      navigate(ROUTES.home, { replace: true });
    } catch (error) {
      if (isApiError(error)) {
        const hasFieldErrors = applyApiFieldErrors(error.details, setError);
        setGlobalError(hasFieldErrors ? null : getErrorMessage(error.code));
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
          <FaArrowLeft className="c-icon c-icon--md" aria-hidden="true" />
        </button>
        <span className="c-register-page__spacer" aria-hidden="true" />
      </header>

      <h1 className="c-register-page__title">Registrarme</h1>

      {globalError ? <ErrorState message={globalError} /> : null}

      <form className="c-register-page__form" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Nombre completo"
          placeholder="Tu nombre completo"
          type="text"
          autoComplete="name"
          {...register('name')}
          error={getFieldError(errors.name)}
          icon={<TbUserCircle className="c-icon c-icon--md" aria-hidden="true" />}
        />

        <Input
          label="Nombre de usuario"
          placeholder="nombre_usuario"
          type="text"
          autoComplete="username"
          {...register('username')}
          error={getFieldError(errors.username)}
          icon={<TbUser className="c-icon c-icon--md" aria-hidden="true" />}
          tooltip={
            <InfoTooltip content="Solo minúsculas, números y los caracteres . _ -. Entre 3 y 50 caracteres." />
          }
        />

        <Input
          label="Correo electrónico"
          placeholder="tu@correo.com"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={getFieldError(errors.email)}
          icon={<TbMail className="c-icon c-icon--md" aria-hidden="true" />}
        />

        <Input
          label="Contraseña"
          placeholder="••••••••"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={getFieldError(errors.password)}
          icon={<TbLock className="c-icon c-icon--md" aria-hidden="true" />}
          tooltip={
            <InfoTooltip content="Mínimo 8 caracteres. Debe incluir mayúscula, minúscula, número y símbolo." />
          }
        />

        <Input
          label="Confirmar contraseña"
          placeholder="••••••••"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={getFieldError(errors.confirmPassword)}
          icon={<TbCheck className="c-icon c-icon--md" aria-hidden="true" />}
        />

        <Input
          label="Código de invitación (opcional)"
          placeholder="ABC12345"
          type="text"
          {...register('inviteCode')}
          error={getFieldError(errors.inviteCode)}
          icon={<TbKey className="c-icon c-icon--md" aria-hidden="true" />}
          tooltip={
            <InfoTooltip content="Si alguien te ha compartido un blíster familiar, introduce aquí el código que ha generado." />
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
              Acepto la <a href="#privacy" className="c-register-page__link">política de privacidad</a>
            </span>
          </label>

          <label className="c-register-page__checkbox-label">
            <input
              type="checkbox"
              {...register('ageConfirmed')}
              className="c-register-page__checkbox-input"
            />
            <span className="c-register-page__checkbox-text">Confirmo que tengo 18 años o más</span>
          </label>

          {(errors.privacyConsent || errors.ageConfirmed) && (
            <p className="c-register-page__error-message">
              {getFieldError(errors.privacyConsent) || getFieldError(errors.ageConfirmed)}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" fullWidth loading={isLoading} className="c-register-page__submit">
          Crear cuenta
        </Button>
      </form>

      <p className="c-register-page__footer">
        ¿Ya tienes una cuenta? <Link to={ROUTES.login} className="c-register-page__login-link">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;