import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch, type FieldError, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { FaArrowLeft } from 'react-icons/fa6';
import {
  TbUserCircle,
  TbUser,
  TbMail,
  TbLock,
  TbCheck,
  TbKey,
  TbCircle,
} from 'react-icons/tb';

import { registerSchema } from '../../../../shared/schemas/auth.schema';
import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { InfoTooltip } from '../../components/atoms/InfoTooltip';
import { Input } from '../../components/atoms/Input';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { ROUTES } from '../../constants/routes';
import { applyUserSettings } from '../../lib/applyUserSettings';
import { register as registerService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { resetAppStores } from '../../stores/reset-stores';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

type RegisterFormData = z.infer<typeof registerSchema>;

type RegisterFormValues = Omit<RegisterFormData, 'privacyConsent' | 'ageConfirmed'> & {
  privacyConsent: boolean;
  ageConfirmed: boolean;
};

const getErrorMessage = (code: string | undefined): string => {
  switch (code) {
    case 'AUTH_EMAIL_CONFLICT':
      return 'Este correo electronico ya esta registrado.';
    case 'AUTH_USERNAME_CONFLICT':
      return 'Este nombre de usuario ya esta en uso.';
    case 'AUTH_INVITE_INVALID':
      return 'El codigo de invitacion es invalido o ha expirado.';
    case 'VALIDATION_ERROR':
      return 'Datos invalidos. Verifica los campos.';
    default:
      return 'Ha ocurrido un error al crear la cuenta. Intentalo de nuevo.';
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
    'Name is required.': 'El nombre completo es obligatorio.',
    'Name must be 100 characters or fewer.': 'El nombre completo no puede superar los 100 caracteres.',
    'Username must be at least 3 characters long.': 'El nombre de usuario debe tener al menos 3 caracteres.',
    'Username must be 50 characters or fewer.': 'El nombre de usuario no puede superar los 50 caracteres.',
    'Password must include an uppercase letter.': 'La contrasena debe incluir una mayuscula.',
    'Password must include a lowercase letter.': 'La contrasena debe incluir una minuscula.',
    'Password must include a number.': 'La contrasena debe incluir un numero.',
    'Password must include a symbol.': 'La contrasena debe incluir un simbolo.',
    'Passwords do not match.': 'Las contrasenas no coinciden.',
    'Email must be valid.': 'Introduce un correo valido.',
    'Username contains invalid characters.': 'Solo minusculas, numeros y . _ -.',
    'Invite code must contain 6 to 8 alphanumeric characters.': 'El codigo de invitacion debe tener entre 6 y 8 caracteres alfanumericos.',
    'Privacy consent is required.': 'Debes aceptar la politica de privacidad.',
    'Age confirmation is required.': 'Debes confirmar que tienes 18 años o mas.',
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

const registerFormResolver: Resolver<RegisterFormValues> = async (values) => {
  const parsed = registerSchema.safeParse(values);

  if (parsed.success) {
    return {
      values: parsed.data as RegisterFormValues,
      errors: {},
    };
  }

  const errors: Partial<Record<keyof RegisterFormValues, FieldError>> = {};

  for (const issue of parsed.error.issues) {
    const fieldName = issue.path[0];
    if (typeof fieldName !== 'string' || !(fieldName in FIELD_ERROR_LABELS)) continue;

    const key = FIELD_ERROR_LABELS[fieldName];
    const message = translateValidationMessage(issue.message);
    const current = errors[key];

    errors[key] = {
      type: current?.type ?? issue.code,
      message: current?.message ?? message,
      types: {
        ...(current?.types ?? {}),
        [`${issue.code}-${Object.keys(current?.types ?? {}).length}`]: message,
      },
    };
  }

  return {
    values: {},
    errors,
  };
};

const PASSWORD_REQUIREMENTS = [
  {
    label: '8 caracteres',
    test: (value: string) => value.trim().length >= 8,
  },
  {
    label: 'Una mayuscula',
    test: (value: string) => /\p{Lu}/u.test(value),
  },
  {
    label: 'Una minuscula',
    test: (value: string) => /\p{Ll}/u.test(value),
  },
  {
    label: 'Un numero',
    test: (value: string) => /\d/.test(value),
  },
  {
    label: 'Un simbolo',
    test: (value: string) => /[^\p{L}\p{N}\s]/u.test(value),
  },
];

const getMissingPasswordRequirements = (value: string): string[] =>
  PASSWORD_REQUIREMENTS
    .filter((requirement) => !requirement.test(value))
    .map((requirement) => requirement.label.toLowerCase());

const getPasswordRequirementMessage = (value: string): string => {
  const missing = getMissingPasswordRequirements(value);
  if (missing.length === 0) return 'La contrasena no esta bien cumplimentada.';
  return `La contrasena debe incluir: ${missing.join(', ')}.`;
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
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: registerFormResolver,
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
  const passwordValue = useWatch({ control, name: 'password' }) ?? '';

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      const session = await registerService(data as RegisterFormData);
      resetAppStores();
      applyUserSettings(session.user.settings);
      setSession(session);

      addToast({
        message: `Bienvenido, ${session.user.name}.`,
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

  const handleInvalidSubmit = () => {
    setGlobalError(null);
    if (getMissingPasswordRequirements(passwordValue).length === 0) return;
    setError('password', {
      type: 'manual',
      message: getPasswordRequirementMessage(passwordValue),
    });
    setFocus('password');
  };

  return (
    <AuthLayout className="c-register-page" tone="brand" innerClassName="c-register-page__inner">
      <header className="c-register-page__header">
        <button
          type="button"
          className="c-register-page__back-btn"
          onClick={() => navigate(ROUTES.login)}
          aria-label="Volver al inicio de sesion"
        >
          <FaArrowLeft className="c-icon c-icon--md" aria-hidden="true" />
        </button>
        <span className="c-register-page__spacer" aria-hidden="true" />
      </header>

      <h1 className="c-register-page__title">Registrarme</h1>

      {globalError ? <ErrorState message={globalError} /> : null}

      <form className="c-register-page__form" onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} noValidate>
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
            <InfoTooltip content="Solo minusculas, numeros y los caracteres . _ -. Entre 3 y 50 caracteres." />
          }
        />

        <Input
          label="Correo electronico"
          placeholder="tu@correo.com"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={getFieldError(errors.email)}
          icon={<TbMail className="c-icon c-icon--md" aria-hidden="true" />}
        />

        <Input
          label="Contrasena"
          placeholder="********"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={getFieldError(errors.password)}
          icon={<TbLock className="c-icon c-icon--md" aria-hidden="true" />}
          tooltip={
            <InfoTooltip content="Minimo 8 caracteres. Debe incluir mayuscula, minuscula, numero y simbolo." />
          }
        />
        <ul className="c-register-page__password-feedback" aria-label="Requisitos de contrasena">
          {PASSWORD_REQUIREMENTS.map((requirement) => {
            const isMet = requirement.test(passwordValue);
            return (
              <li
                key={requirement.label}
                className={isMet ? 'is-met' : undefined}
              >
                {isMet ? (
                  <TbCheck aria-hidden="true" />
                ) : (
                  <TbCircle aria-hidden="true" />
                )}
                <span>{requirement.label}</span>
              </li>
            );
          })}
        </ul>

        <Input
          label="Confirmar contrasena"
          placeholder="********"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={getFieldError(errors.confirmPassword)}
          icon={<TbCheck className="c-icon c-icon--md" aria-hidden="true" />}
        />

        <Input
          label="Codigo de invitacion (opcional)"
          placeholder="ABC12345"
          type="text"
          {...register('inviteCode')}
          error={getFieldError(errors.inviteCode)}
          icon={<TbKey className="c-icon c-icon--md" aria-hidden="true" />}
          tooltip={
            <InfoTooltip content="Si alguien te ha compartido un blister familiar, introduce aqui el codigo que ha generado." />
          }
        />

        <div className="c-register-page__checkboxes">
          <div className="c-register-page__checkbox-field">
            {errors.privacyConsent ? (
              <p className="c-register-page__error-message">
                {getFieldError(errors.privacyConsent)}
              </p>
            ) : null}
            <label className="c-register-page__checkbox-label">
              <input
                type="checkbox"
                {...register('privacyConsent')}
                className="c-register-page__checkbox-input"
              />
              <span className="c-register-page__checkbox-text">
                Acepto la <Link to={ROUTES.privacy} state={{ parentRoute: ROUTES.register }} className="c-register-page__link">política de privacidad</Link>
              </span>
            </label>
          </div>

          <div className="c-register-page__checkbox-field">
            {errors.ageConfirmed ? (
              <p className="c-register-page__error-message">
                {getFieldError(errors.ageConfirmed)}
              </p>
            ) : null}
            <label className="c-register-page__checkbox-label">
              <input
                type="checkbox"
                {...register('ageConfirmed')}
                className="c-register-page__checkbox-input"
              />
              <span className="c-register-page__checkbox-text">Confirmo que tengo 18 años o mas</span>
            </label>
          </div>
        </div>

        <Button type="submit" variant="primary" fullWidth loading={isLoading} className="c-register-page__submit">
          Crear cuenta
        </Button>
      </form>

      <p className="c-register-page__footer">
        Ya tienes una cuenta? <Link to={ROUTES.login} className="c-register-page__login-link">Inicia sesion</Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;
