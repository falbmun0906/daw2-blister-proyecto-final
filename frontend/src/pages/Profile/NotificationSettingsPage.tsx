import { useCallback, useState } from 'react';
import { TbBellRinging, TbCalendarTime } from 'react-icons/tb';

import { ErrorState } from '../../components/atoms/ErrorState';
import { FormSection } from '../../components/molecules/FormSection';
import { usePageTitle } from '../../hooks/use.page-title';
import {
  subscribeToServerPush,
  unsubscribeFromServerPush,
} from '../../lib/push-notifications';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { User, UserSettings } from '../../types/auth.types';

type NotificationSettings = UserSettings['notifications'];

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  pushEnabled: false,
  stock: true,
  expiration: true,
  cima: true,
  adherence: true,
  doses: true,
  appointments: true,
  appointmentReminderPreset: '3h',
  customAppointmentReminderHours: 3,
};

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={['c-notification-settings__toggle', disabled && 'c-notification-settings__toggle--disabled'].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="c-notification-settings__toggle-control" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

const getSettingsErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }

  if (isApiError(err)) {
    return err.message;
  }

  return 'No se han podido actualizar las preferencias.';
};

const getCustomHoursError = (settings: NotificationSettings): string | null => (
  settings.appointments
    && settings.appointmentReminderPreset === 'custom'
    && (!Number.isInteger(settings.customAppointmentReminderHours)
      || settings.customAppointmentReminderHours < 1
      || settings.customAppointmentReminderHours > 168)
    ? 'Introduce un número entero entre 1 y 168 horas.'
    : null
);

interface NotificationSettingsFormProps {
  user: User;
  updateUser: (user: Partial<User>) => void;
  addToast: (toast: { message: string; variant: 'success' | 'error' | 'info' }) => void;
}

function NotificationSettingsForm({
  user,
  updateUser,
  addToast,
}: NotificationSettingsFormProps) {
  const [settings, setSettings] = useState<NotificationSettings>(user.settings.notifications ?? DEFAULT_NOTIFICATIONS);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<keyof NotificationSettings | null>(null);

  const customHoursError = getCustomHoursError(settings);

  const persistSettings = useCallback(async (
    key: keyof NotificationSettings,
    nextSettings: NotificationSettings,
    rollbackSettings: NotificationSettings,
  ): Promise<void> => {
    if (!user) {
      return;
    }

    const nextCustomHoursError = getCustomHoursError(nextSettings);
    if (nextCustomHoursError && key !== 'customAppointmentReminderHours') {
      setError(nextCustomHoursError);
      return;
    }

    setSavingKey(key);
    setError(null);
    try {
      if (key === 'pushEnabled' && nextSettings.pushEnabled) {
        const result = await subscribeToServerPush();
        if (!result.enabled) {
          throw new Error(result.reason ?? 'No se ha podido activar Web Push.');
        }
      }

      const updated = await updateProfile({
        settings: {
          ...user.settings,
          notifications: nextSettings,
        },
      });
      updateUser(updated);

      if (key === 'pushEnabled' && !nextSettings.pushEnabled) {
        await unsubscribeFromServerPush().catch(() => undefined);
      }

      addToast({ message: 'Preferencia actualizada.', variant: 'success' });
    } catch (err) {
      setSettings(rollbackSettings);

      if (key === 'pushEnabled' && nextSettings.pushEnabled) {
        await unsubscribeFromServerPush().catch(() => undefined);
      }

      setError(getSettingsErrorMessage(err));
    } finally {
      setSavingKey(null);
    }
  }, [addToast, updateUser, user]);

  const updateSetting = useCallback(<Key extends keyof NotificationSettings>(
    key: Key,
    value: NotificationSettings[Key],
  ): void => {
    const rollbackSettings = settings;
    const nextSettings: NotificationSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    void persistSettings(key, nextSettings, rollbackSettings);
  }, [persistSettings, settings]);

  const updateCustomHours = (rawValue: string): void => {
    const nextValue = rawValue === '' ? 0 : Number(rawValue);
    setSettings((current) => ({
      ...current,
      customAppointmentReminderHours: Number.isNaN(nextValue) ? 0 : nextValue,
    }));
  };

  const persistCustomHours = (): void => {
    if (!user) {
      return;
    }

    if (customHoursError) {
      setError(customHoursError);
      return;
    }

    if (settings.customAppointmentReminderHours === user.settings.notifications.customAppointmentReminderHours) {
      return;
    }

    void persistSettings('customAppointmentReminderHours', settings, user.settings.notifications);
  };

  const disabled = savingKey !== null;

  return (
    <section className="c-notification-settings" aria-label="Notificaciones">
      {error ? <ErrorState message={error} /> : null}

      <FormSection label="Avisos push" icon={<TbBellRinging aria-hidden="true" />}>
        <ToggleRow label="Activar notificaciones push" checked={settings.pushEnabled} disabled={disabled} onChange={(value) => updateSetting('pushEnabled', value)} />
        <ToggleRow label="Stock bajo o agotado" checked={settings.stock} disabled={disabled} onChange={(value) => updateSetting('stock', value)} />
        <ToggleRow label="Caducidad de medicamentos" checked={settings.expiration} disabled={disabled} onChange={(value) => updateSetting('expiration', value)} />
        <ToggleRow label="Cambios oficiales CIMA" checked={settings.cima} disabled={disabled} onChange={(value) => updateSetting('cima', value)} />
        <ToggleRow label="Tomas registradas en modo forzado" checked={settings.adherence} disabled={disabled} onChange={(value) => updateSetting('adherence', value)} />
        <ToggleRow label="Hora de las tomas programadas" checked={settings.doses} disabled={disabled} onChange={(value) => updateSetting('doses', value)} />
      </FormSection>

      <FormSection label="Citas médicas" icon={<TbCalendarTime aria-hidden="true" />}>
        <ToggleRow label="Avisarme antes de una cita" checked={settings.appointments} disabled={disabled} onChange={(value) => updateSetting('appointments', value)} />
        <div className="c-field">
          <label className="c-field__label" htmlFor="appointment-reminder-preset">
            <span className="c-field__label-text">Cuándo avisar</span>
          </label>
          <select
            id="appointment-reminder-preset"
            className="c-field__select"
            value={settings.appointmentReminderPreset}
            onChange={(event) => updateSetting('appointmentReminderPreset', event.target.value as NotificationSettings['appointmentReminderPreset'])}
            disabled={!settings.appointments || disabled}
          >
            <option value="3h">3 horas antes</option>
            <option value="12h">12 horas antes</option>
            <option value="1d">1 día antes</option>
            <option value="custom">Personalizar</option>
          </select>
        </div>
        {settings.appointmentReminderPreset === 'custom' ? (
          <div className={['c-field', customHoursError && 'c-field--error'].filter(Boolean).join(' ')}>
            <label className="c-field__label" htmlFor="custom-reminder-hours">
              <span className="c-field__label-text">Horas antes</span>
            </label>
            <input
              id="custom-reminder-hours"
              className="c-field__input"
              type="number"
              min={1}
              max={168}
              value={settings.customAppointmentReminderHours}
              onChange={(event) => updateCustomHours(event.target.value)}
              onBlur={persistCustomHours}
              disabled={!settings.appointments || disabled}
              aria-invalid={customHoursError ? true : undefined}
              aria-describedby={customHoursError ? 'custom-reminder-hours-error' : undefined}
              aria-errormessage={customHoursError ? 'custom-reminder-hours-error' : undefined}
            />
            {customHoursError ? (
              <span id="custom-reminder-hours-error" className="c-field__error" role="status" aria-live="polite">
                {customHoursError}
              </span>
            ) : null}
          </div>
        ) : null}
      </FormSection>
    </section>
  );
}

export default function NotificationSettingsPage() {
  usePageTitle('Notificaciones');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUiStore((s) => s.addToast);

  if (!user) return null;

  return (
    <NotificationSettingsForm
      key={user.id}
      user={user}
      updateUser={updateUser}
      addToast={addToast}
    />
  );
}
