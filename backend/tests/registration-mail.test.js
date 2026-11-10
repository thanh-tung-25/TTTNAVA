import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeGmail } from '../src/utils/gmail.js';
import { registrationAvailable, sendRegistrationOtp } from '../src/services/registration-mail.js';

const smtp = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn(), close: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: smtp.createTransport } }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

function configure() {
  vi.stubEnv('REGISTRATION_ENABLED', 'true');
  vi.stubEnv('REGISTRATION_MAIL_PROVIDER', 'resend');
  vi.stubEnv('RESEND_API_KEY', 'mail_test_key_not_a_real_credential');
  vi.stubEnv('REGISTRATION_FROM_EMAIL', 'TTNAVA <noreply@example.com>');
}

describe('Gmail inbox identity', () => {
  it('keeps a normalized delivery address and combines dot, case and plus aliases', () => {
    for (const email of [' Ngoc.Mai+Hoc@GMAIL.COM ', 'ngocmai@gmail.com', 'ngoc.mai+khac@gmail.com']) {
      expect(normalizeGmail(email).identity).toBe('ngocmai@gmail.com');
    }
    expect(normalizeGmail(' Ngoc.Mai+Hoc@GMAIL.COM ').email).toBe('ngoc.mai+hoc@gmail.com');
    expect(normalizeGmail('ngocmai2@gmail.com').identity).toBe('ngocmai2@gmail.com');
  });

  it('rejects unsupported domains and malformed or injected addresses', () => {
    for (const value of [null, {}, '', 'name@example.com', 'name@googlemail.com', 'name@gmail.com.evil',
      'name@@gmail.com', 'first_last@gmail.com', 'first..last@gmail.com', '.first@gmail.com',
      'first.@gmail.com', 'first+@gmail.com', 'first last@gmail.com', 'tên@gmail.com',
      'name@gmail.com\r\nBcc: victim@gmail.com', `${'a'.repeat(65)}@gmail.com`]) {
      expect(() => normalizeGmail(value)).toThrow(expect.objectContaining({ status: 400, code: 'INVALID_GMAIL' }));
    }
  });
});

describe('Gmail registration email provider', () => {
  function configureGmail() {
    vi.stubEnv('REGISTRATION_ENABLED', 'true');
    vi.stubEnv('REGISTRATION_MAIL_PROVIDER', 'gmail');
    vi.stubEnv('GMAIL_USER', ' Sender.Name@GMAIL.COM ');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'abcd efgh ijkl mnop');
    vi.stubEnv('REGISTRATION_FROM_EMAIL', 'Arbitrary <spoof@example.com>');
    smtp.sendMail.mockReset();
    smtp.createTransport.mockReturnValue({ sendMail: smtp.sendMail, close: smtp.close });
  }

  it('requires a Gmail sender and app password, without a paid domain or Resend settings', () => {
    configureGmail();
    vi.stubEnv('RESEND_API_KEY', '');
    expect(registrationAvailable()).toBe(true);
    vi.stubEnv('GMAIL_APP_PASSWORD', 'normal-password');
    expect(registrationAvailable()).toBe(false);
    vi.stubEnv('GMAIL_APP_PASSWORD', 'abcdefghijklmnop');
    vi.stubEnv('GMAIL_USER', 'sender@example.com');
    expect(registrationAvailable()).toBe(false);
    vi.stubEnv('GMAIL_USER', 'sender+alias@gmail.com');
    expect(registrationAvailable()).toBe(false);
    vi.stubEnv('GMAIL_USER', 'sender@gmail.com');
    vi.stubEnv('REGISTRATION_MAIL_PROVIDER', 'unknown');
    expect(registrationAvailable()).toBe(false);
  });

  it('uses fixed TLS SMTP settings, sender and envelope; strips app password spaces and closes transport', async () => {
    configureGmail();
    const fetcher = vi.spyOn(globalThis, 'fetch');
    smtp.sendMail.mockResolvedValue({ messageId: 'smtp-id', accepted: ['student@gmail.com'] });
    await expect(sendRegistrationOtp({ email: 'student@gmail.com', otp: '123456' })).resolves.toEqual({ messageId: 'smtp-id' });
    expect(smtp.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com', port: 465, secure: true, pool: false,
      auth: { user: 'sender.name@gmail.com', pass: 'abcdefghijklmnop' },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 10_000,
      disableFileAccess: true, disableUrlAccess: true,
    }));
    expect(smtp.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'TTNAVA <sender.name@gmail.com>', to: ['student@gmail.com'],
      envelope: { from: 'sender.name@gmail.com', to: ['student@gmail.com'] },
      text: expect.stringContaining('123456'), html: expect.stringContaining('123456'),
    }));
    expect(smtp.close).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('closes failed SMTP sends and returns only a sanitized delivery error', async () => {
    configureGmail();
    smtp.sendMail.mockRejectedValue(new Error('sensitive SMTP password and provider detail'));
    const failure = await sendRegistrationOtp({ email: 'student@gmail.com', otp: '123456' }).catch(value => value);
    expect(failure).toMatchObject({ status: 503, code: 'MAIL_DELIVERY_FAILED', details: null });
    expect(failure.message).not.toMatch(/sensitive|password|123456/);
    expect(smtp.close).toHaveBeenCalledTimes(1);
  });

  it('does not treat a rejected recipient as successful delivery', async () => {
    configureGmail();
    smtp.sendMail.mockResolvedValue({ messageId: 'smtp-id', accepted: [], rejected: ['student@gmail.com'] });
    await expect(sendRegistrationOtp({ email: 'student@gmail.com', otp: '123456' }))
      .rejects.toMatchObject({ status: 503, code: 'MAIL_DELIVERY_FAILED' });
    expect(smtp.close).toHaveBeenCalledTimes(1);
  });
});

describe('Registration email provider', () => {
  it('requires explicit enablement and both provider settings', async () => {
    configure();
    expect(registrationAvailable()).toBe(true);
    vi.stubEnv('REGISTRATION_ENABLED', 'false');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    expect(registrationAvailable()).toBe(false);
    await expect(sendRegistrationOtp({ email: 'student@gmail.com', otp: '123456' }))
      .rejects.toMatchObject({ status: 503, code: 'REGISTRATION_UNAVAILABLE' });
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv('REGISTRATION_ENABLED', 'true');
    vi.stubEnv('RESEND_API_KEY', ' ');
    expect(registrationAvailable()).toBe(false);
    vi.stubEnv('RESEND_API_KEY', 'mail_test_key');
    vi.stubEnv('REGISTRATION_FROM_EMAIL', '');
    expect(registrationAvailable()).toBe(false);
  });

  it('sends a real API request with text and HTML OTP templates and a bounded timeout', async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'mail-id' }), { status: 200 }));
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await expect(sendRegistrationOtp({ email: ' Student.Name+Hoc@GMAIL.COM ', otp: '123456' })).resolves.toEqual({ messageId: 'mail-id' });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer mail_test_key_not_a_real_credential');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(timeout).toHaveBeenCalledWith(10_000);
    const body = JSON.parse(options.body);
    expect(body.from).toBe('TTNAVA <noreply@example.com>');
    expect(body.to).toEqual(['student.name+hoc@gmail.com']);
    expect(body.text).toContain('123456');
    expect(body.html).toContain('123456');
    expect(body.subject).not.toContain('123456');
  });

  it('rejects invalid input before sending', async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, 'fetch');
    await expect(sendRegistrationOtp({ email: 'student@gmail.com', otp: '<12345' })).rejects.toMatchObject({ status: 400, code: 'INVALID_OTP' });
    await expect(sendRegistrationOtp({ email: 'student@example.com', otp: '123456' })).rejects.toMatchObject({ status: 400, code: 'INVALID_GMAIL' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('never reports delivery success or exposes provider errors after failure', async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const failures = [
      () => Promise.resolve(new Response(JSON.stringify({ message: 'sensitive provider detail' }), { status: 403 })),
      () => Promise.resolve(new Response('invalid-json', { status: 200 })),
      () => Promise.resolve(new Response('{}', { status: 200 })),
      () => Promise.reject(new Error('transport failure with sensitive provider detail')),
      () => Promise.reject(new DOMException('sensitive timeout detail', 'TimeoutError')),
    ];
    for (const failure of failures) {
      fetcher.mockImplementationOnce(failure);
      const error = await sendRegistrationOtp({ email: 'student@gmail.com', otp: '123456' }).catch(value => value);
      expect(error).toMatchObject({ status: 503, code: 'MAIL_DELIVERY_FAILED', details: null });
      expect(error.message).not.toMatch(/sensitive|123456|mail_test_key/);
    }
  });
});
