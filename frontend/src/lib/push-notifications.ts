import {
  deletePushSubscription,
  getPushConfig,
  savePushSubscription,
} from '../services/notifications.service';
import {
  pushSubscriptionSchema,
  type PushSubscriptionInput,
} from '../../../shared/schemas/notification.schema';

export interface ServerPushSyncResult {
  enabled: boolean;
  reason?: string;
}

const SERVICE_WORKER_READY_TIMEOUT_MS = 5000;

const urlBase64ToUint8Array = (value: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
};

const isServerPushSupported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const getReadyServiceWorker = async (): Promise<ServiceWorkerRegistration | null> =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS);
    }),
  ]);

const serializeSubscription = (
  subscription: PushSubscription,
): PushSubscriptionInput => {
  const json = subscription.toJSON();
  return pushSubscriptionSchema.parse({
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
  });
};

export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
};

export const showPushNotification = async (title: string, body: string): Promise<void> => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const registration = 'serviceWorker' in navigator ? await getReadyServiceWorker() : null;
  if (registration) {
    await registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });
    return;
  }
  new Notification(title, { body, icon: '/pwa-192x192.png' });
};

export const subscribeToServerPush = async (): Promise<ServerPushSyncResult> => {
  if (!isServerPushSupported()) {
    return {
      enabled: false,
      reason: 'Este navegador no soporta Web Push.',
    };
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    return {
      enabled: false,
      reason: 'Activa los permisos de notificaciones del navegador.',
    };
  }

  const config = await getPushConfig();
  if (!config.enabled || !config.publicKey) {
    return {
      enabled: false,
      reason: 'El servidor no tiene configuradas las claves Web Push.',
    };
  }

  const registration = await getReadyServiceWorker();
  if (!registration) {
    return {
      enabled: false,
      reason: 'El service worker de la PWA todavia no esta listo.',
    };
  }
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.publicKey),
  });
  await savePushSubscription(serializeSubscription(subscription));

  return { enabled: true };
};

export const unsubscribeFromServerPush = async (): Promise<void> => {
  if (!isServerPushSupported()) return;

  const registration = await getReadyServiceWorker();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const input = serializeSubscription(subscription);
  await deletePushSubscription({ endpoint: input.endpoint });
  await subscription.unsubscribe();
};
