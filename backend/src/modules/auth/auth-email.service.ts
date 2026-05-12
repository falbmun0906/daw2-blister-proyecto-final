import { Resend } from 'resend';

import { env } from '../../config/env';

const AUTH_EMAIL_FROM = 'Blíster <ayuda@miblister.es>';

const EMAIL_COLORS = {
  accent: '#c96f52',
  primaryMid: '#2f7a68',
  colorBg: '#f5f5f5',
  colorText: '#24332f',
  colorTextMuted: '#63756f',
  colorSurface: '#ffffff',
} as const;

interface PasswordResetEmailInput {
  to: string;
  resetUrl: string;
}

interface EmailVerificationInput {
  to: string;
  confirmUrl: string;
  name: string;
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

const buildEmailVerificationText = (confirmUrl: string): string =>
  [
    'Blíster - Confirma tu correo',
    '',
    'Gracias por usar Blíster. Confirma este correo para mantener tu cuenta actualizada.',
    'El enlace caduca en 24 horas y solo se puede usar una vez.',
    '',
    confirmUrl,
    '',
    'Si no has pedido este cambio, puedes ignorar este mensaje.',
  ].join('\n');

const getEmailLogoUrl = (): string =>
  new URL('/logo.png', env.emailAssetOrigin).toString();

const renderBaseEmail = ({
  titleHtml,
  bodyHtml,
  ctaHref,
  ctaLabel,
  footer,
}: {
  titleHtml: string;
  bodyHtml: string;
  ctaHref: string;
  ctaLabel: string;
  footer: string;
}): string => {
  const safeCtaHref = escapeHtml(ctaHref);
  const safeLogoUrl = escapeHtml(getEmailLogoUrl());

  return `
  <div style="margin:0;padding:0;background:${EMAIL_COLORS.colorBg};font-family:Arial,Helvetica,sans-serif;color:${EMAIL_COLORS.colorText};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${EMAIL_COLORS.colorBg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border-collapse:collapse;background:${EMAIL_COLORS.colorSurface};border-radius:24px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:36px 28px 20px;">
                <img src="${safeLogoUrl}" width="88" height="88" alt="Logo de Blíster" style="display:block;border:0;margin:0 auto 18px;">
                <h1 style="margin:0;font-size:34px;line-height:1.05;font-weight:700;color:${EMAIL_COLORS.colorText};">
                  ${titleHtml}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 12px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px 28px;">
                <a href="${safeCtaHref}" style="display:inline-block;background:${EMAIL_COLORS.primaryMid};color:${EMAIL_COLORS.colorSurface};text-decoration:none;font-size:17px;font-weight:700;border-radius:999px;padding:15px 28px;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 34px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:${EMAIL_COLORS.colorTextMuted};text-align:center;">
                  ${escapeHtml(footer)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
};

const buildPasswordResetHtml = (resetUrl: string): string => {
  const bodyHtml = `
                <p style="margin:0 0 16px;font-size:17px;line-height:1.55;color:${EMAIL_COLORS.colorText};text-align:center;">
                  Blíster se usa mejor cuando tu cuenta está <span style="color:${EMAIL_COLORS.accent};font-weight:700;">segura</span>.
                  Usa este enlace para crear una nueva contraseña.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.colorTextMuted};text-align:center;">
                  El enlace caduca en 30 minutos y solo se puede usar una vez.
                </p>`;

  return renderBaseEmail({
    titleHtml: `<span style="color:${EMAIL_COLORS.accent};">Recupera</span> tu contraseña`,
    bodyHtml,
    ctaHref: resetUrl,
    ctaLabel: 'Crear nueva contraseña',
    footer: 'Si no has pedido este cambio, puedes ignorar este mensaje.',
  });
};

const buildEmailVerificationHtml = ({ confirmUrl, name }: EmailVerificationInput): string => {
  const safeName = escapeHtml(name);
  const bodyHtml = `
                <p style="margin:0 0 16px;font-size:17px;line-height:1.55;color:${EMAIL_COLORS.colorText};text-align:center;">
                  Hola ${safeName}. Confirma este correo para que Blíster pueda mantener tu cuenta <span style="color:${EMAIL_COLORS.accent};font-weight:700;">protegida</span>.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.55;color:${EMAIL_COLORS.colorTextMuted};text-align:center;">
                  El enlace caduca en 24 horas y solo se puede usar una vez.
                </p>`;

  return renderBaseEmail({
    titleHtml: `<span style="color:${EMAIL_COLORS.accent};">Confirma</span> tu correo`,
    bodyHtml,
    ctaHref: confirmUrl,
    ctaLabel: 'Confirmar correo',
    footer: 'Si no has pedido este cambio, puedes ignorar este mensaje.',
  });
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
    from: AUTH_EMAIL_FROM,
    to,
    subject: 'Recupera tu contraseña de Blíster',
    html: buildPasswordResetHtml(resetUrl),
    text: buildPasswordResetText(resetUrl),
  });
};

/**
 * Sends an email confirmation link through Resend.
 */
export const sendEmailVerificationEmail = async ({
  to,
  confirmUrl,
  name,
}: EmailVerificationInput): Promise<void> => {
  if (!env.resendApiKey) {
    if (env.nodeEnv === 'production') {
      throw new Error('RESEND_API_KEY is required to send email verification emails.');
    }

    return;
  }

  const resend = new Resend(env.resendApiKey);

  await resend.emails.send({
    from: AUTH_EMAIL_FROM,
    to,
    subject: 'Confirma tu correo de Blíster',
    html: buildEmailVerificationHtml({ to, confirmUrl, name }),
    text: buildEmailVerificationText(confirmUrl),
  });
};
