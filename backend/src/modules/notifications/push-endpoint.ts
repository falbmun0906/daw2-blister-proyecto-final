import { env } from '../../config/env';
import { AppError } from '../../utils/app-error';

const providerHosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];

/** Trust known push providers, never arbitrary URLs or private IP literals. */
export const assertPushEndpoint = (endpoint: string): void => {
  let url: URL;
  try { url = new URL(endpoint); } catch { throw invalidEndpoint(); }
  const host = url.hostname.toLowerCase();
  const configuredHosts = env.webPushAllowedHosts;
  const allowed = providerHosts.includes(host) || configuredHosts.includes(host)
    || (host.endsWith('.notify.windows.com') && host !== '.notify.windows.com');
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) throw invalidEndpoint();
};

const invalidEndpoint = () => new AppError({ code: 'PUSH_ENDPOINT_INVALID', message: 'El destino no pertenece a un proveedor push permitido.', statusCode: 400 });
