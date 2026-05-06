self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        title: 'Blister',
        body: event.data.text(),
      };
    }
  }

  const title = typeof payload.title === 'string' ? payload.title : 'Blister';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const url = typeof payload.url === 'string' ? payload.url : '/notifications';
  const notificationId = typeof payload.notificationId === 'string'
    ? payload.notificationId
    : undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: notificationId,
      data: {
        url,
        notificationId,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/notifications';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('navigate' in client && 'focus' in client) {
            return client.navigate(targetUrl).then((targetClient) => (
              targetClient ? targetClient.focus() : client.focus()
            ));
          }
        }

        return self.clients.openWindow(targetUrl);
      }),
  );
});
