import { api, escapeHtml } from '/assets/js/api.js';
import {
  openModal,
  setBusy,
  showError,
  toast,
} from '/assets/js/ui.js';
import { avatarOptions, store } from './admin-students-context.js';
import { load } from './admin-students-load.js';

export function openCreate() {
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
            store.page = 1;
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

export async function openEdit(id) {
  try {
    const student = store.studentsById.get(id);
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

export function openPassword(id) {
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
