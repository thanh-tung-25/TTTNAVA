import { api, avatarUrl, escapeHtml } from './api.js';

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
      <a class="brand" href="${home}"><img class="brand-mark" src="/assets/images/ttnava-logo.png" alt="" width="44" height="44"> TTNAVA</a>
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
