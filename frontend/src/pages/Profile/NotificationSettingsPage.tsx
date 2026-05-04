import { useMemo, useState } from 'react';
import { TbBellRinging, TbCalendarTime } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { FormSection } from '../../components/molecules/FormSection';
import { usePageTitle } from '../../hooks/use.page-title';
import { requestPushPermission } from '../../lib/push-notifications';
import { updateProfile } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { UserSettings } from '../../types/auth.types';
import './NotificationSettingsPage.scss';

type NotificationSettings = UserSettings['notifications'];

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  pushEnabled: false,
  stock: true,
  expiration: true,
  cima: true,
  adherence: true,
  appointments: true,
  appointmentReminderPreset: '3h',
  customAppointmentReminderHours: 3,
};

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="c-notification-settings__toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="c-notification-settings__toggle-control" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export default function NotificationSettingsPage() {
  usePageTitle('Notificaciones');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const addToast = useUiStore((s) => s.addToast);
  const initial = useMemo(() => user?.settings.notifications ?? DEFAULT_NOTIFICATIONS, [user]);
  const [settings, setSettings] = useState<NotificationSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const setFlag = (key: keyof NotificationSettings, value: boolean | number | string): void => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      if (settings.pushEnabled) {
        const permission = await requestPushPermission();
        if (permission !== 'granted') {
          setSettings((current) => ({ ...current, pushEnabled: false }));
          throw new Error('Activa los permisos de notificaciones del navegador para usar avisos push.');
        }
      }
      const updated = await updateProfile({
        settings: {
          ...user.settings,
          notifications: settings,
        },
      });
      updateUser(updated);
      addToast({ message: 'Preferencias de notificaciones guardadas.', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : isApiError(err) ? err.message : 'No se han podido guardar las preferencias.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="c-notification-settings" aria-labelledby="notification-settings-title">
      <h1 id="notification-settings-title" className="c-notification-settings__title">Notificaciones</h1>
      {error ? <ErrorState message={error} /> : null}

      <FormSection label="Avisos push" icon={<TbBellRinging aria-hidden="true" />}>
        <ToggleRow label="Activar notificaciones push" checked={settings.pushEnabled} onChange={(value) => setFlag('pushEnabled', value)} />
        <ToggleRow label="Stock bajo o agotado" checked={settings.stock} onChange={(value) => setFlag('stock', value)} />
        <ToggleRow label="Caducidad de medicamentos" checked={settings.expiration} onChange={(value) => setFlag('expiration', value)} />
        <ToggleRow label="Cambios oficiales CIMA" checked={settings.cima} onChange={(value) => setFlag('cima', value)} />
        <ToggleRow label="Tomas registradas en modo forzado" checked={settings.adherence} onChange={(value) => setFlag('adherence', value)} />
      </FormSection>

      <FormSection label="Citas médicas" icon={<TbCalendarTime aria-hidden="true" />}>
        <ToggleRow label="Avisarme antes de una cita" checked={settings.appointments} onChange={(value) => setFlag('appointments', value)} />
        <label className="c-field">
          <span className="c-field__label"><span className="c-field__label-text">Cuándo avisar</span></span>
          <select
            className="c-field__select"
            value={settings.appointmentReminderPreset}
            onChange={(event) => setFlag('appointmentReminderPreset', event.target.value)}
            disabled={!settings.appointments}
          >
            <option value="3h">3 horas antes</option>
            <option value="12h">12 horas antes</option>
            <option value="1d">1 día antes</option>
            <option value="custom">Personalizar</option>
          </select>
        </label>
        {settings.appointmentReminderPreset === 'custom' ? (
          <label className="c-field">
            <span className="c-field__label"><span className="c-field__label-text">Horas antes</span></span>
            <input
              className="c-field__input"
              type="number"
              min={1}
              max={168}
              value={settings.customAppointmentReminderHours}
              onChange={(event) => setFlag('customAppointmentReminderHours', Number(event.target.value) || 1)}
              disabled={!settings.appointments}
            />
          </label>
        ) : null}
      </FormSection>

      <Button type="button" variant="primary" fullWidth loading={saving} onClick={() => void handleSave()}>
        Guardar preferencias
      </Button>
    </section>
  );
}