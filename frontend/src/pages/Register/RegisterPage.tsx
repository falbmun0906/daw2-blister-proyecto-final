import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

import { registerSchema, USERNAME_MAX_LENGTH } from '../../../../shared/schemas/auth.schema';
import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { InfoTooltip } from '../../components/atoms/InfoTooltip';
import { Input } from '../../components/atoms/Input';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { ROUTES } from '../../constants/routes';
import { register as registerService } from '../../services/auth.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

type RegisterFormData = z.infer<typeof registerSchema>;

type RegisterFormValues = Omit<RegisterFormData, 'privacyConsent' | 'ageConfirmed'> & {
  privacyConsent: boolean;
  ageConfirmed: boolean;
};

const DEFAULT_REGISTER_VALUES: RegisterFormValues = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  privacyConsent: false,
  ageConfirmed: false,
  inviteCode: '',
};

const getBooleanDraftValue = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const getStringDraftValue = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getRegisterDraft = (state: unknown): Partial<RegisterFormValues> => {
  if (typeof state !== 'object' || state === null) return {};
  const candidate = state as { registerDraft?: unknown };
  if (typeof candidate.registerDraft !== 'object' || candidate.registerDraft === null) return {};
  const draft = candidate.registerDraft as Partial<Record<keyof RegisterFormValues, unknown>>;

  return {
    name: getStringDraftValue(draft.name),
    username: getStringDraftValue(draft.username),
    email: getStringDraftValue(draft.email),
    password: getStringDraftValue(draft.password),
    confirmPassword: getStringDraftValue(draft.confirmPassword),
    privacyConsent: getBooleanDraftValue(draft.privacyConsent),
    ageConfirmed: getBooleanDraftValue(draft.ageConfirmed),
    inviteCode: getStringDraftValue(draft.inviteCode),
  };
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
      return 'Datos inválidos. Verifica los campos.';
    default:
      return 'Ha ocurrido un error al crear la cuenta. Inténtalo de nuevo.';
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
    'Name is required.': 'El nombre y apellido es obligatorio.',
    'Name must be 100 characters or fewer.': 'El nombre y apellido no puede superar los 100 caracteres.',
    'Username must be at least 3 characters long.': 'El nombre de usuario debe tener al menos 3 caracteres.',
    'Username must be 50 characters or fewer.': `El nombre de usuario no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`,
    [`El nombre de usuario no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`]: `El nombre de usuario no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`,
    'Password must include an uppercase letter.': 'La contraseña debe incluir una mayúscula.',
    'Password must include a lowercase letter.': 'La contraseña debe incluir una minúscula.',
    'Password must include a number.': 'La contraseña debe incluir un número.',
    'Password must include a symbol.': 'La contraseña debe incluir un símbolo.',
    'Passwords do not match.': 'Las contraseñas no coinciden.',
    'Email must be valid.': 'Introduce un correo válido.',
    'Username contains invalid characters.': 'Solo minúsculas, números y . _ -.',
    'Invite code must contain 6 to 8 alphanumeric characters.': 'El código de invitación debe tener entre 6 y 8 caracteres alfanuméricos.',
    'Privacy consent is required.': 'Debes aceptar la política de privacidad.',
    'Age confirmation is required.': 'Debes confirmar que tienes 18 años o más.',
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
    label: 'Una mayúscula',
    test: (value: string) => /\p{Lu}/u.test(value),
  },
  {
    label: 'Una minúscula',
    test: (value: string) => /\p{Ll}/u.test(value),
  },
  {
    label: 'Un número',
    test: (value: string) => /\d/.test(value),
  },
  {
    label: 'Un símbolo',
    test: (value: string) => /[^\p{L}\p{N}\s]/u.test(value),
  },
];

const getMissingPasswordRequirements = (value: string): string[] =>
  PASSWORD_REQUIREMENTS
    .filter((requirement) => !requirement.test(value))
    .map((requirement) => requirement.label.toLowerCase());

const getPasswordRequirementMessage = (value: string): string => {
  const missing = getMissingPasswordRequirements(value);
  if (missing.length === 0) return 'La contraseña no está bien cumplimentada.';
  return `La contraseña debe incluir: ${missing.join(', ')}.`;
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
  const location = useLocation();
  const addToast = useUiStore((state) => state.addToast);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const defaultValues = useMemo(
    () => ({ ...DEFAULT_REGISTER_VALUES, ...getRegisterDraft(location.state) }),
    [location.state],
  );

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
    defaultValues,
  });
  const passwordValue = useWatch({ control, name: 'password' }) ?? '';
  const watchedValues = useWatch({ control });
  const privacyState = useMemo(
    () => ({
      parentRoute: ROUTES.register,
      registerDraft: { ...DEFAULT_REGISTER_VALUES, ...watchedValues },
    }),
    [watchedValues],
  );

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setGlobalError(null);

    try {
      await registerService(data as RegisterFormData);
      setRegisteredEmail(data.email);

      addToast({
        message: 'Te hemos enviado el correo de confirmación.',
        variant: 'success',
      });
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

  if (registeredEmail) {
    return (
      <AuthLayout className="c-register-page" tone="brand" innerClassName="c-register-page__inner">
        <header className="c-register-page__header">
          <button
            type="button"
            className="c-register-page__back-btn"
            onClick={() => setRegisteredEmail(null)}
            aria-label="Volver al registro"
          >
            <FaArrowLeft className="c-icon c-icon--md" aria-hidden="true" />
          </button>
          <span className="c-register-page__spacer" aria-hidden="true" />
        </header>

        <section className="c-register-page__sent" aria-labelledby="register-email-sent-title">
          <h1 id="register-email-sent-title" className="c-register-page__title">
            Revisa tu correo
          </h1>
          <p className="c-register-page__sent-text">
            Te hemos enviado un correo de confirmación a <span>{registeredEmail}</span>.
          </p>
          <p className="c-register-page__sent-text">
            Confirma tu cuenta antes de iniciar sesión y revisa también la carpeta de <span>spam</span>.
          </p>
          <Button type="button" variant="primary" fullWidth onClick={() => navigate(ROUTES.login)}>
            Ir a iniciar sesión
          </Button>
        </section>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout className="c-register-page" tone="brand" innerClassName="c-register-page__inner">
      <header className="c-register-page__header">
        <button
          type="button"
          className="c-register-page__back-btn"
          onClick={() => navigate(ROUTES.login)}
          aria-label="Volver al inicio de sesión"
        >
          <FaArrowLeft className="c-icon c-icon--md" aria-hidden="true" />
        </button>
        <span className="c-register-page__spacer" aria-hidden="true" />
      </header>

      <h1 className="c-register-page__title">Registrarme</h1>

      {globalError ? <ErrorState message={globalError} /> : null}

      <form className="c-register-page__form" onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} noValidate>
        <Input
          label="Nombre y apellido"
          placeholder="Tu nombre y apellido"
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
          maxLength={USERNAME_MAX_LENGTH}
          {...register('username')}
          error={getFieldError(errors.username)}
          icon={<TbUser className="c-icon c-icon--md" aria-hidden="true" />}
          tooltip={
            <InfoTooltip content={`Será tu usuario para iniciar sesión. Usa minúsculas, números y . _ -. Entre 3 y ${USERNAME_MAX_LENGTH} caracteres.`} />
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
          placeholder="********"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={getFieldError(errors.password)}
          icon={<TbLock className="c-icon c-icon--md" aria-hidden="true" />}
          tooltip={
            <InfoTooltip content="Mínimo 8 caracteres. Debe incluir mayúscula, minúscula, número y símbolo." />
          }
        />
        <ul className="c-register-page__password-feedback" aria-label="Requisitos de contraseña">
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
          label="Confirmar contraseña"
          placeholder="********"
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
                Acepto la <Link to={ROUTES.privacy} state={privacyState} className="c-register-page__link">política de privacidad</Link>
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
              <span className="c-register-page__checkbox-text">Confirmo que tengo 18 años o más</span>
            </label>
          </div>
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
