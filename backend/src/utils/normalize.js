export function normalizeFillIn(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ');
}

export function normalizePrompt(value) {
  return String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function parseJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function usernameToEmail(username) {
  return `${username}@kids-learning.invalid`;
}

export function normalizeUsername(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en-US');
}
