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
  studentsById: new Map(),
};

export const avatarOptions = (selected) => AVATARS.map((avatar) => (
  `<option value="${avatar.key}"${avatar.key === selected ? ' selected' : ''}>${avatar.name}</option>`
)).join('');

export function row(student) {
  const locked = student.locked;
  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:.5rem">
          <img class="avatar avatar-sm" src="${avatarUrl(student.avatarKey)}" alt="">
          <div><strong>${escapeHtml(student.displayName)}</strong><br><span class="muted">@${escapeHtml(student.username)}</span></div>
        </div>
      </td>
      <td>Lớp ${student.grade}</td>
      <td>${locked ? '<span class="badge badge-danger">Đã khoá</span>' : '<span class="badge badge-success">Hoạt động</span>'}</td>
      <td>${formatDate(student.createdAt, false)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-edit="${student.id}" type="button">Sửa</button>
          <button class="btn btn-ghost btn-sm" data-password="${student.id}" type="button">Mật khẩu</button>
          <button class="btn ${locked ? 'btn-ghost' : 'btn-danger'} btn-sm" data-lock="${student.id}" data-locked="${locked}" type="button">${locked ? 'Mở khoá' : 'Khoá'}</button>
        </div>
      </td>
    </tr>`;
}
