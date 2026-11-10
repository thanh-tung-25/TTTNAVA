import { AppError } from './errors.js';

const dotAtom = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const gmailName = /^[a-z0-9]+(?:\.[a-z0-9]+)*$/;

// Personal Gmail ignores dots and delivers +tags to the same underlying inbox.
// Keep the entered delivery address separately from the unique inbox identity.
export function normalizeGmail(input) {
  const email = typeof input === 'string' ? input.trim().toLowerCase() : '';
  const [local, domain, extra] = email.split('@');
  const base = local?.split('+', 1)[0];
  if (email.length > 120 || domain !== 'gmail.com' || extra !== undefined
    || !local || local.length > 64 || !dotAtom.test(local)
    || !gmailName.test(base) || local.endsWith('+')) {
    throw new AppError(400, 'INVALID_GMAIL', 'Vui lòng nhập địa chỉ Gmail hợp lệ, ví dụ tenban@gmail.com.');
  }
  return { email, identity: `${base.replaceAll('.', '')}@gmail.com` };
}
