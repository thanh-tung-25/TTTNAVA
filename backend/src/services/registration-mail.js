import { AppError } from '../utils/errors.js';
import { normalizeGmail } from '../utils/gmail.js';
import nodemailer from 'nodemailer';

function mailProvider() {
  return (process.env.REGISTRATION_MAIL_PROVIDER || 'resend').trim().toLowerCase();
}

function gmailSettings() {
  const user = process.env.GMAIL_USER?.trim().toLowerCase() || '';
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '') || '';
  try {
    normalizeGmail(user);
    if (user.includes('+') || !/^[a-z0-9]{16}$/i.test(pass)) return null;
    return { user, pass };
  } catch {
    return null;
  }
}

export function registrationAvailable() {
  if (process.env.REGISTRATION_ENABLED !== 'true') return false;
  if (mailProvider() === 'gmail') return Boolean(gmailSettings());
  return mailProvider() === 'resend'
    && Boolean(process.env.RESEND_API_KEY?.trim())
    && Boolean(process.env.REGISTRATION_FROM_EMAIL?.trim());
}

export async function sendRegistrationOtp({ email, otp }) {
  if (!registrationAvailable()) {
    throw new AppError(503, 'REGISTRATION_UNAVAILABLE', 'Đăng ký tài khoản đang tạm chưa khả dụng. Vui lòng thử lại sau.');
  }
  const destination = normalizeGmail(email).email;
  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    throw new AppError(400, 'INVALID_OTP', 'Mã xác minh phải gồm 6 chữ số.');
  }
  const text = `Mã xác minh đăng ký TTNAVA của bạn là: ${otp}\n\nMã có hiệu lực trong 5 phút và chỉ dùng một lần. Không chia sẻ mã với người khác.\nNếu bạn không yêu cầu đăng ký, bạn có thể bỏ qua email này.`;
  const html = `<div lang="vi" style="font-family:Arial,sans-serif;line-height:1.6;color:#18312a;max-width:520px;margin:auto;padding:24px"><h1 style="font-size:24px">Xác minh đăng ký TTNAVA</h1><p>Nhập mã sau để hoàn tất đăng ký tài khoản:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${otp}</p><p>Mã có hiệu lực trong <strong>5 phút</strong> và chỉ dùng một lần. Không chia sẻ mã với người khác.</p><p>Nếu bạn không yêu cầu đăng ký, bạn có thể bỏ qua email này.</p></div>`;
  const message = { to: [destination], subject: 'Mã xác minh đăng ký TTNAVA', text, html };
  try {
    if (mailProvider() === 'gmail') {
      const auth = gmailSettings();
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth,
        pool: false,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      try {
        const result = await transporter.sendMail({
          ...message,
          from: `TTNAVA <${auth.user}>`,
          envelope: { from: auth.user, to: [destination] },
        });
        if (!result?.messageId || !result.accepted?.some(address => String(address).toLowerCase() === destination)) {
          throw new Error('MAIL_PROVIDER_REJECTED');
        }
        return { messageId: result.messageId };
      } finally {
        try { transporter.close(); } catch { /* Connection cleanup must not expose provider errors. */ }
      }
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.REGISTRATION_FROM_EMAIL.trim(),
        ...message,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('MAIL_PROVIDER_REJECTED');
    const result = await response.json();
    if (typeof result?.id !== 'string' || !result.id) throw new Error('MAIL_PROVIDER_INVALID_RESPONSE');
    return { messageId: result.id };
  } catch {
    // Never expose provider responses, credentials or the OTP in an API error.
    throw new AppError(503, 'MAIL_DELIVERY_FAILED', 'Chưa gửi được mã xác minh. Vui lòng thử lại sau ít phút.');
  }
}
