import { api, avatarUrl, escapeHtml, toast } from './api.js';

const STUDENT_NAV = [
  ['home', '/pages/student/home/', 'Trang chủ'],
  ['practice', '/pages/student/practice/', 'Luyện tập'],
  ['exam', '/pages/student/exam/', 'Thi'],
  ['challenge', '/pages/student/challenge/', 'Thách đấu'],
  ['leaderboard', '/pages/student/leaderboard/', 'Xếp hạng'],
  ['diamonds', '/pages/student/diamonds/', 'Kim cương'],
  ['history', '/pages/student/history/', 'Lịch sử'],
];

const ADMIN_NAV = [
  ['students', '/pages/admin/students/', 'Học sinh'],
  ['questions', '/pages/admin/questions/', 'Câu hỏi'],
  ['stats', '/pages/admin/stats/', 'Thống kê'],
];

let currentProfile = null;
let diamondTotal = null;

function renderHeader(profile, role, active) {
  const nav = role === 'admin' ? ADMIN_NAV : STUDENT_NAV;
  const home = role === 'admin' ? '/pages/admin/students/' : '/pages/student/home/';
  const subtitle = role === 'admin'
    ? 'Quản trị viên'
    : (profile.grade ? `Học sinh lớp ${profile.grade}` : 'Học sinh');

  const links = nav.map(([key, href, label]) => (
    `<a class="nav-link" href="${href}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`
  )).join('');

  const header = document.getElementById('app-header');
  header.className = 'topbar';
  header.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="${home}"><span class="brand-mark" aria-hidden="true">✏️</span> Bé Học Vui</a>
      <div class="topbar-user">
        ${role === 'student' ? '<span class="diamond-chip" id="diamond-chip" title="Kim cương của con">💎 <span>…</span></span>' : ''}
        <img class="avatar" src="${avatarUrl(profile.avatarKey)}" alt="Ảnh đại diện của ${escapeHtml(profile.displayName)}">
        <span class="user-meta"><strong>${escapeHtml(profile.displayName)}</strong><span>${subtitle}</span></span>
        <button class="btn btn-ghost btn-sm" type="button" id="logout-button">Thoát</button>
      </div>
    </div>
    <nav class="nav-scroll" aria-label="Điều hướng chính">${links}</nav>
  `;

  header.querySelector('#logout-button').addEventListener('click', async () => {
    try {
      await api('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Vẫn chuyển về trang đăng nhập dù lỗi mạng.
    }
    window.location.replace('/pages/login/');
  });
}

export async function initPage(role, active) {
  const payload = await api('/api/v1/auth/me');
  const profile = payload.data.profile;
  if (profile.role !== role) {
    window.location.replace(profile.role === 'admin' ? '/pages/admin/students/' : '/pages/student/home/');
    throw new Error('SAI_VAI_TRO');
  }
  currentProfile = profile;
  renderHeader(profile, role, active);
  document.body.dataset.role = role;
  if (role === 'student') loadDiamonds();
  return profile;
}

export function getProfile() {
  return currentProfile;
}

async function loadDiamonds() {
  try {
    const payload = await api('/api/v1/diamonds/summary');
    diamondTotal = payload.data.total;
    updateDiamondChip();
  } catch {
    // Không chặn trang nếu chưa tải được kim cương.
  }
}

export function updateDiamondChip() {
  const chip = document.getElementById('diamond-chip');
  if (!chip) return;
  chip.querySelector('span').textContent = new Intl.NumberFormat('vi-VN').format(diamondTotal ?? 0);
}

export function setDiamondTotal(value) {
  diamondTotal = Number(value) || 0;
  updateDiamondChip();
}

export async function syncDiamondTotal() {
  try {
    const payload = await api('/api/v1/diamonds/summary');
    setDiamondTotal(payload.data.total);
  } catch {
    // Không chặn màn hình kết quả nếu chưa tải được số kim cương.
  }
}

export function openModal({ title, content, actions = [], onMount = null }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head">
        <h2 id="modal-title">${escapeHtml(title)}</h2>
        <button class="icon-btn" type="button" data-close aria-label="Đóng">✕</button>
      </div>
      <div class="modal-body"></div>
      <div class="modal-actions"></div>
    </div>
  `;
  const body = backdrop.querySelector('.modal-body');
  if (content instanceof Node) body.append(content);
  else body.innerHTML = content ?? '';

  const actionBar = backdrop.querySelector('.modal-actions');
  const close = () => {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector('[data-close]').addEventListener('click', close);

  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.className ?? 'btn';
    button.textContent = action.label;
    if (action.disabled) button.disabled = true;
    button.addEventListener('click', () => action.onClick?.(close, button));
    actionBar.append(button);
  }

  document.body.append(backdrop);
  onMount?.(backdrop, close);
  const focusable = backdrop.querySelector('input, select, textarea, button:not([data-close])');
  focusable?.focus();
  return { backdrop, close };
}

export function confirmAction(message, { title = 'Xác nhận', confirmText = 'Đồng ý', danger = false } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value, close) => {
      if (settled) return;
      settled = true;
      resolve(value);
      close();
    };
    const modal = openModal({
      title,
      content: `<p style="margin:0">${escapeHtml(message)}</p>`,
      actions: [
        { label: 'Huỷ', className: 'btn btn-ghost', onClick: (close) => finish(false, close) },
        {
          label: confirmText,
          className: danger ? 'btn btn-danger' : 'btn',
          onClick: (close) => finish(true, close),
        },
      ],
    });
    modal.backdrop.addEventListener('click', (event) => {
      if (event.target === modal.backdrop) finish(false, () => {});
    });
  });
}

export function setBusy(button, busy, busyLabel = 'Đang xử lý…') {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label ?? button.textContent;
    button.disabled = false;
  }
}

export function showError(container, error) {
  if (!container) {
    toast(error.message ?? 'Có lỗi xảy ra', 'error');
    return;
  }
  container.textContent = error.message ?? 'Có lỗi xảy ra, con thử lại nhé!';
  container.classList.remove('hidden');
}

export function clearError(container) {
  container?.classList.add('hidden');
}

export function praiseFor(percent) {
  if (percent >= 100) return { emoji: '🎉', title: 'Con giỏi quá!', message: 'Đúng hết rồi! Con thật tuyệt vời!' };
  if (percent >= 70) return { emoji: '🌟', title: 'Con làm rất tốt!', message: 'Cố gắng thêm chút nữa để đạt điểm tuyệt đối nhé!' };
  if (percent >= 40) return { emoji: '💪', title: 'Con đã cố gắng rồi!', message: 'Luyện tập thêm sẽ giỏi hơn nữa!' };
  return { emoji: '🌱', title: 'Đừng lo nhé!', message: 'Mỗi lần luyện tập là một bước tiến!' };
}

export const TYPE_LABELS = {
  single_choice: 'Chọn một đáp án',
  multiple_choice: 'Chọn nhiều đáp án',
  true_false: 'Đúng hay sai?',
  fill_in: 'Điền vào chỗ trống',
};

export function answerText(question) {
  const answer = question.correctAnswer ?? question.answer ?? {};
  if (question.type === 'single_choice') {
    const option = (question.options ?? []).find((item) => item.key === answer.key);
    return option ? `${option.label ?? option.key.toUpperCase()}. ${option.text}` : answer.key ?? '—';
  }
  if (question.type === 'multiple_choice') {
    return (answer.keys ?? []).map((key) => {
      const option = (question.options ?? []).find((item) => item.key === key);
      return option ? `${option.label ?? option.key.toUpperCase()}. ${option.text}` : key;
    }).join('; ') || '—';
  }
  if (question.type === 'true_false') return answer.value ? 'Đúng' : 'Sai';
  return (answer.accepted ?? []).join(' / ') || '—';
}

export function emptyState(icon, title, message = '') {
  return `<div class="empty"><span class="empty-icon" aria-hidden="true">${icon}</span><strong>${escapeHtml(title)}</strong>${message ? `<p style="margin:.3rem 0 0">${escapeHtml(message)}</p>` : ''}</div>`;
}

export { toast };
