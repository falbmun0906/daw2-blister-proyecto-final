import { Resend } from 'resend';

import { env } from '../../config/env';

const RESET_EMAIL_FROM = 'Blíster <ayuda@miblister.es>';

interface PasswordResetEmailInput {
  to: string;
  resetUrl: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPasswordResetText = (resetUrl: string): string =>
  [
    'Blíster - Recupera tu contraseña',
    '',
    'Hemos recibido una solicitud para crear una nueva contraseña.',
    'El enlace caduca en 30 minutos y solo se puede usar una vez.',
    '',
    resetUrl,
    '',
    'Si no has pedido este cambio, puedes ignorar este mensaje.',
  ].join('\n');

const buildPasswordResetHtml = (resetUrl: string): string => {
  const safeResetUrl = escapeHtml(resetUrl);

  return `
  <div style="margin:0;padding:0;background:#f7f3ef;font-family:Arial,Helvetica,sans-serif;color:#24332f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f7f3ef;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border-collapse:collapse;background:#fffdf9;border-radius:24px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:36px 28px 20px;">
                <img src="${escapeHtml(env.clientOrigin)}/logo.png" width="88" height="88" alt="Logo de Blíster" style="display:block;border:0;margin:0 auto 18px;">
                <h1 style="margin:0;font-size:34px;line-height:1.05;font-weight:700;color:#24332f;">
                  <span style="color:#c96f52;">Recupera</span> tu contraseña
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 12px;">
                <p style="margin:0 0 16px;font-size:17px;line-height:1.55;color:#40534d;text-align:center;">
                  Blíster se usa mejor cuando tu cuenta está <span style="color:#c96f52;font-weight:700;">segura</span>.
                  Usa este enlace para crear una nueva contraseña.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.55;color:#63756f;text-align:center;">
                  El enlace caduca en 30 minutos y solo se puede usar una vez.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px 28px;">
                <a href="${safeResetUrl}" style="display:inline-block;background:#2f7a68;color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;border-radius:999px;padding:15px 28px;">
                  Crear nueva contraseña
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 34px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#7c8a85;text-align:center;">
                  Si no has pedido este cambio, puedes ignorar este mensaje.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
};

/**
 * Sends the password reset email through Resend.
 */
export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}: PasswordResetEmailInput): Promise<void> => {
  if (!env.resendApiKey) {
    if (env.nodeEnv === 'production') {
      throw new Error('RESEND_API_KEY is required to send password reset emails.');
    }

    return;
  }

  const resend = new Resend(env.resendApiKey);

  await resend.emails.send({
    from: RESET_EMAIL_FROM,
    to,
    subject: 'Recupera tu contraseña de Blíster',
    html: buildPasswordResetHtml(resetUrl),
    text: buildPasswordResetText(resetUrl),
  });
};
