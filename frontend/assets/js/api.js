export const AVATARS = [
  { key: 'meo', name: 'Mèo cam' },
  { key: 'cho', name: 'Chó nâu' },
  { key: 'tho', name: 'Thỏ trắng' },
  { key: 'gau', name: 'Gấu nâu' },
  { key: 'cao', name: 'Cáo cam' },
  { key: 'cu', name: 'Sư tử' },
  { key: 'ech', name: 'Ếch xanh' },
  { key: 'ga', name: 'Gà con' },
  { key: 'voi', name: 'Voi xanh' },
  { key: 'khi', name: 'Khỉ nâu' },
  { key: 'gau-truc', name: 'Gấu trúc' },
  { key: 'ho', name: 'Hổ cam' },
];

export function avatarUrl(key) {
  if(key==='cu'||key==='lion')return '/assets/avatars/lion.svg';
  const known = AVATARS.some((avatar) => avatar.key === key);
  return `/assets/avatars/${known ? key : 'meo'}.svg`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isLoginPage() {
  return window.location.pathname.startsWith('/pages/login');
}

export async function api(path, options = {}) {
  const { method = 'GET', headers = {}, raw = false } = options;
  let { body } = options;
  if (body instanceof FormData && body.get('file') instanceof File && /\.docx$/i.test(body.get('file').name)) {
    body = await prepareWordUpload(body);
  }
  const init = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...headers },
    ...(options.signal?{signal:options.signal}:{}),
    ...(options.cache?{cache:options.cache}:{}),
  };
  const courseId=localStorage.getItem('ttnava-course');
  if(courseId)init.headers['X-Course-Id']=courseId;
  if(path==='/api/v1/auth/logout'){
    const device=localStorage.getItem('ttnava-chat-device');
    if(device)init.headers['X-Chat-Device']=device;
    window.dispatchEvent(new Event('ttnava:logout'));
  }
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if(error.name==='AbortError')throw error;
    throw new ApiError('Không kết nối được máy chủ. Con kiểm tra mạng nhé!', 0, 'NETWORK');
  }

  if (raw) {
    if (!response.ok) throw new ApiError('Yêu cầu thất bại', response.status, 'RAW');
    return response;
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  const locked = response.status === 403 && payload?.error?.code === 'ACCOUNT_LOCKED';
  if ((response.status === 401 || locked) && !isLoginPage()) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/pages/login/?next=${next}`);
    throw new ApiError(locked ? 'Tài khoản đã bị khoá.' : 'Con cần đăng nhập lại.', response.status,
      locked ? 'ACCOUNT_LOCKED' : 'UNAUTHENTICATED');
  }

  if (!response.ok) {
    const error = payload?.error ?? {};
    if(error.code==='COURSE_LOCKED'&&location.pathname.startsWith('/pages/student/')&&!location.pathname.startsWith('/pages/student/courses/')) {
      location.replace('/pages/student/courses/?locked='+encodeURIComponent(error.details?.courseId||''));
    }
    throw new ApiError(error.message ?? 'Có lỗi xảy ra, con thử lại nhé!', response.status, error.code, error.details);
  }
  return payload;
}

let uploadConfig;
const uploadedFiles = new WeakMap();
async function prepareWordUpload(form) {
  uploadConfig ??= api('/api/v1/runtime').then(result => result.data).catch(error => { uploadConfig = undefined; throw error; });
  if (!(await uploadConfig).directWordUpload) return form;
  const file = form.get('file');
  let uploaded = uploadedFiles.get(file);
  if (!uploaded || uploaded.expiresAt <= Date.now()) {
    const bytes = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const digest = [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
    uploaded = (await api('/api/v1/storage/word-upload', { method: 'POST', body: { filename: file.name, bytes: file.size, sha256: digest } })).data;
    const response = await fetch(uploaded.signedUrl, { method: 'PUT', credentials: 'omit', headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'x-upsert': 'false' }, body: bytes });
    if (!response.ok) throw new ApiError('Tải Word lên kho tệp chưa thành công. Vui lòng thử lại.', response.status, 'WORD_UPLOAD_FAILED');
    uploadedFiles.set(file, uploaded);
  }
  const body = Object.fromEntries(form.entries());
  delete body.file;
  body.fileToken = uploaded.fileToken;
  return body;
}

export function toast(message, type = 'info') {
  let root = document.querySelector('.toast-root');
  if (!root) {
    root = document.createElement('div');
    root.className = 'toast-root';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    document.body.append(root);
  }
  const item = document.createElement('div');
  item.className = `toast ${type === 'info' ? '' : `toast-${type}`}`.trim();
  item.textContent = message;
  root.append(item);
  setTimeout(() => item.remove(), 3600);
}

export function formatDate(value, withTime = true) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const options = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Intl.DateTimeFormat('vi-VN', options).format(date);
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatPercent(correct, total) {
  if (!total) return 0;
  return Math.round((Number(correct) / Number(total)) * 100);
}

export function clampText(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
