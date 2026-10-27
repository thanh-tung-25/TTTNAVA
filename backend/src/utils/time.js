export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

export function addMinutes(date, minutes) {
  return addSeconds(date, minutes * 60);
}

export function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function secondsUntil(target, now = new Date()) {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000));
}

/**
 * Mốc tuần/tháng tính theo giờ Việt Nam (UTC+7, không có DST).
 * Tuần bắt đầu thứ Hai 00:00 giờ Việt Nam.
 */
export function vnRange(range, now = new Date()) {
  if (range === 'all') return { start: null, end: null };
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const year = vnNow.getUTCFullYear();
  const month = vnNow.getUTCMonth();
  const day = vnNow.getUTCDate();

  if (range === 'week') {
    const dayOfWeek = (vnNow.getUTCDay() + 6) % 7;
    const start = new Date(Date.UTC(year, month, day - dayOfWeek) - VN_OFFSET_MS);
    return { start, end: now };
  }

  if (range === 'month') {
    const start = new Date(Date.UTC(year, month, 1) - VN_OFFSET_MS);
    return { start, end: now };
  }

  throw new Error(`Khoảng thời gian không hợp lệ: ${range}`);
}

export function vnDateKey(date) {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}-${String(vn.getUTCDate()).padStart(2, '0')}`;
}

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}
