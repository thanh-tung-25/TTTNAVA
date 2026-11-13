import { AVATARS, avatarUrl, escapeHtml, formatDate } from '/assets/js/api.js';

export const elements = {
  table: document.getElementById('students-table'),
  searchInput: document.getElementById('search-input'),
  pageLabel: document.getElementById('page-label'),
  prevButton: document.getElementById('prev-page'),
  nextButton: document.getElementById('next-page'),
};

export const store = {
  page: 1,
  totalPages: 1,
  search: '',
  status: 'active',
  program: ['primary','secondary','chinese'].includes(new URLSearchParams(location.search).get('program')) ? new URLSearchParams(location.search).get('program') : '',
  studentsById: new Map(),
  canCreateAccounts: false,
  canManageAccounts: true,
  adminScope: 'super',
};

export const avatarOptions = (selected) => AVATARS.map((avatar) => (
  `<option value="${avatar.key}"${avatar.key === selected ? ' selected' : ''}>${avatar.name}</option>`
)).join('');

export function row(student) {
  const locked = student.locked;
  const deleted = store.status === 'deleted';
  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem">
          <img class="avatar avatar-sm" src="${avatarUrl(student.avatarKey)}" alt="">
          <div><strong>${escapeHtml(student.displayName)}</strong><br><span class="muted">@${escapeHtml(student.username)}</span>${deleted&&student.deletionReason?`<p class="muted student-deletion-reason">Lý do: ${escapeHtml(student.deletionReason)}</p>`:''}</div>
        </div>
      </td>
      <td>${store.adminScope==='chinese'?'Tiếng Trung':store.adminScope==='primary'?'Tiểu học':store.adminScope==='secondary'?'THCS':student.grade === null ? 'Tiếng Trung' : `Lớp ${student.grade}`}</td>
      <td>${deleted ? '<span class="badge badge-danger">Đã xóa</span>' : locked ? '<span class="badge badge-danger">Đã khoá</span>' : '<span class="badge badge-success">Hoạt động</span>'}</td>
      <td>${formatDate(deleted ? student.deletedAt : student.createdAt, false)}</td>
      <td>
        <a class="btn btn-ghost btn-sm" href="/pages/admin/access-history/?account=${encodeURIComponent(student.id)}">Lịch sử truy cập</a>
        ${store.canManageAccounts?deleted?`<button class="btn btn-ghost btn-sm" data-restore-student="${student.id}" type="button">Khôi phục</button>`:`<div class="actions">
          <button class="btn btn-ghost btn-sm" data-edit="${student.id}" type="button">Sửa</button>
          <button class="btn btn-ghost btn-sm" data-password="${student.id}" type="button">Mật khẩu</button>
          <button class="btn ${locked ? 'btn-ghost' : 'btn-danger'} btn-sm" data-lock="${student.id}" data-locked="${locked}" type="button">${locked ? 'Mở khoá' : 'Khoá'}</button>
          <button class="btn btn-danger btn-sm" data-delete-student="${student.id}" type="button">Xóa</button>
        </div>`:'<span class="muted">Chỉ xem</span>'}
      </td>
    </tr>`;
}
