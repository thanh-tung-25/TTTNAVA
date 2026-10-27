import { api, avatarUrl, escapeHtml, formatDate } from '/assets/js/api.js';
import {
  confirmAction,
  emptyState,
  initPage,
  openModal,
  setBusy,
  showError,
  toast,
} from '/assets/js/ui.js';
import { AVATARS } from '/assets/js/api.js';

const tableEl = document.getElementById('students-table');
const searchInput = document.getElementById('search-input');
const pageLabel = document.getElementById('page-label');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');

let page = 1;
let totalPages = 1;
let search = '';
let studentsById = new Map();

const avatarOptions = (selected) => AVATARS.map((avatar) => (
  `<option value="${avatar.key}"${avatar.key === selected ? ' selected' : ''}>${avatar.name}</option>`
)).join('');

function row(student) {
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

async function load() {
  tableEl.innerHTML = '<div class="loading">Đang tải danh sách…</div>';
  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('q', search);
    const payload = await api(`/api/v1/admin/students?${params}`);
    studentsById = new Map(payload.data.map((student) => [student.id, student]));
    totalPages = Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit));
    tableEl.innerHTML = payload.data.length
      ? `<div class="table-wrap"><table class="table admin-table">
          <thead><tr><th>Học sinh</th><th>Lớp</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
          <tbody>${payload.data.map(row).join('')}</tbody>
        </table></div>`
      : emptyState('👧', 'Chưa có học sinh nào', 'Bấm “Thêm học sinh” để tạo tài khoản đầu tiên.');
    pageLabel.textContent = `Trang ${page}/${totalPages} · ${payload.pagination.total} học sinh`;
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  } catch (error) {
    tableEl.innerHTML = emptyState('😿', 'Không tải được danh sách', error.message);
  }
}

function openCreate() {
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-error hidden" data-error role="alert"></div>
    <div class="field"><label for="new-username">Tên đăng nhập</label>
      <input class="input" id="new-username" name="username" maxlength="20" placeholder="be_lan" required>
      <span class="hint">3–20 ký tự: chữ thường, số, dấu gạch dưới.</span></div>
    <div class="field"><label for="new-display-name">Tên hiển thị</label>
      <input class="input" id="new-display-name" name="displayName" maxlength="60" placeholder="Bé Lan" required></div>
    <div class="field"><label for="new-password">Mật khẩu ban đầu</label>
      <input class="input" id="new-password" name="password" type="text" maxlength="72" minlength="6" placeholder="Ít nhất 6 ký tự" required></div>
    <div class="grid grid-2">
      <div class="field"><label for="new-grade">Lớp</label>
        <select class="select" id="new-grade" name="grade">${[1, 2, 3, 4, 5].map((grade) => `<option value="${grade}">Lớp ${grade}</option>`).join('')}</select></div>
      <div class="field"><label for="new-avatar">Ảnh đại diện</label>
        <select class="select" id="new-avatar" name="avatarKey">${avatarOptions('meo')}</select></div>
    </div>`;
  const modal = openModal({
    title: 'Thêm học sinh',
    content: form,
    actions: [
      { label: 'Huỷ', className: 'btn btn-ghost', onClick: (close) => close() },
      {
        label: 'Tạo tài khoản',
        onClick: async (close, button) => {
          const errorBox = modal.backdrop.querySelector('[data-error]');
          errorBox.classList.add('hidden');
          setBusy(button, true, 'Đang tạo…');
          try {
            await api('/api/v1/admin/students', {
              method: 'POST',
              body: {
                username: form.username.value.trim(),
                displayName: form.displayName.value.trim(),
                password: form.password.value,
                grade: Number(form.grade.value),
                avatarKey: form.avatarKey.value,
              },
            });
            toast('Đã tạo tài khoản học sinh.', 'success');
            close();
            page = 1;
            load();
          } catch (error) {
            showError(errorBox, error);
            setBusy(button, false);
          }
        },
      },
    ],
  });
}

async function openEdit(id) {
  try {
    const student = studentsById.get(id);
    if (!student) throw new Error('Không tìm thấy học sinh');
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="form-error hidden" data-error role="alert"></div>
      <div class="field"><label for="edit-name">Tên hiển thị</label>
        <input class="input" id="edit-name" name="displayName" maxlength="60" value="${escapeHtml(student.displayName)}" required></div>
      <div class="grid grid-2">
        <div class="field"><label for="edit-grade">Lớp</label>
          <select class="select" id="edit-grade" name="grade">${[1, 2, 3, 4, 5].map((grade) => `<option value="${grade}"${grade === student.grade ? ' selected' : ''}>Lớp ${grade}</option>`).join('')}</select></div>
        <div class="field"><label for="edit-avatar">Ảnh đại diện</label>
          <select class="select" id="edit-avatar" name="avatarKey">${avatarOptions(student.avatarKey)}</select></div>
      </div>
      <p class="hint">Tên đăng nhập @${escapeHtml(student.username)} không thay đổi.</p>`;
    const modal = openModal({
      title: 'Sửa học sinh',
      content: form,
      actions: [
        { label: 'Huỷ', className: 'btn btn-ghost', onClick: (close) => close() },
        {
          label: 'Lưu thay đổi',
          onClick: async (close, button) => {
            const errorBox = modal.backdrop.querySelector('[data-error]');
            errorBox.classList.add('hidden');
            setBusy(button, true, 'Đang lưu…');
            try {
              await api(`/api/v1/admin/students/${id}`, {
                method: 'PATCH',
                body: {
                  displayName: form.displayName.value.trim(),
                  grade: Number(form.grade.value),
                  avatarKey: form.avatarKey.value,
                },
              });
              toast('Đã cập nhật học sinh.', 'success');
              close();
              load();
            } catch (error) {
              showError(errorBox, error);
              setBusy(button, false);
            }
          },
        },
      ],
    });
  } catch (error) {
    toast(error.message, 'error');
  }
}

function openPassword(id) {
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-error hidden" data-error role="alert"></div>
    <div class="field"><label for="reset-password">Mật khẩu mới</label>
      <input class="input" id="reset-password" name="newPassword" type="text" minlength="6" maxlength="72" required>
      <span class="hint">6–72 ký tự. Học sinh đang đăng nhập trên thiết bị khác sẽ không bị đăng xuất.</span></div>`;
  const modal = openModal({
    title: 'Đặt lại mật khẩu',
    content: form,
    actions: [
      { label: 'Huỷ', className: 'btn btn-ghost', onClick: (close) => close() },
      {
        label: 'Đặt lại',
        onClick: async (close, button) => {
          const errorBox = modal.backdrop.querySelector('[data-error]');
          errorBox.classList.add('hidden');
          setBusy(button, true, 'Đang đổi…');
          try {
            await api(`/api/v1/admin/students/${id}/password`, {
              method: 'POST',
              body: { newPassword: form.newPassword.value },
            });
            toast('Đã đặt lại mật khẩu.', 'success');
            close();
          } catch (error) {
            showError(errorBox, error);
            setBusy(button, false);
          }
        },
      },
    ],
  });
}

async function toggleLock(id, locked, name) {
  const yes = await confirmAction(
    locked ? `Mở khoá tài khoản của ${name}?` : `Khoá tài khoản của ${name}? Học sinh sẽ không đăng nhập được.`,
    { title: locked ? 'Mở khoá' : 'Khoá tài khoản', confirmText: locked ? 'Mở khoá' : 'Khoá', danger: !locked },
  );
  if (!yes) return;
  try {
    await api(`/api/v1/admin/students/${id}/lock`, { method: 'POST', body: { locked: !locked } });
    toast(locked ? 'Đã mở khoá tài khoản.' : 'Đã khoá tài khoản.', 'success');
    load();
  } catch (error) {
    toast(error.message, 'error');
  }
}

tableEl.addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]');
  const password = event.target.closest('[data-password]');
  const lock = event.target.closest('[data-lock]');
  if (edit) openEdit(edit.dataset.edit);
  else if (password) openPassword(password.dataset.password);
  else if (lock) {
    const name = lock.closest('tr').querySelector('strong')?.textContent ?? 'học sinh';
    toggleLock(lock.dataset.lock, lock.dataset.locked === 'true', name);
  }
});

document.getElementById('create-button').addEventListener('click', openCreate);
document.getElementById('search-button').addEventListener('click', () => {
  search = searchInput.value.trim();
  page = 1;
  load();
});
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    search = searchInput.value.trim();
    page = 1;
    load();
  }
});
prevButton.addEventListener('click', () => { if (page > 1) { page -= 1; load(); } });
nextButton.addEventListener('click', () => { if (page < totalPages) { page += 1; load(); } });

async function main() {
  await initPage('admin', 'students');
  await load();
}

main().catch((error) => {
  tableEl.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
