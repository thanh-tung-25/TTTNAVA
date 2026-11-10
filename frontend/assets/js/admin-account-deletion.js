import { api, escapeHtml } from '/assets/js/api.js';
import { openModal, setBusy, showError, toast } from '/assets/js/ui.js';
import { setupPasswordToggle } from './password-toggle.js';

function whenClosed(modal, cleanup) {
  const observer = new MutationObserver(() => {
    if (!modal.backdrop.isConnected) { observer.disconnect(); cleanup(); }
  });
  observer.observe(document.body, { childList: true });
}
const identity = student => `<div class="student-deletion-identity"><strong>${escapeHtml(student.displayName)}</strong><span>@${escapeHtml(student.username)}</span></div>`;
const count = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function openAccountDeletion({ id, basePath, accountKey = 'account', onChanged }) {
  try {
    const { data } = await api(`${basePath}/${id}/deletion-preview`);
    const student = data[accountKey], summary = data.summary || {};
    if (!student || student.id !== id) throw new Error('Không tải được đúng tài khoản. Bạn hãy tải lại danh sách.');
    const form = document.createElement('form');
    form.className = 'student-deletion-form';
    form.noValidate = true;
    form.autocomplete = 'off';
    form.innerHTML = `
      <p class="eyebrow">Bước 1/2 · Kiểm tra đúng tài khoản</p>
      <div class="form-error hidden" id="delete-student-error" role="alert" tabindex="-1"></div>
      ${identity(student)}
      <p>Tài khoản sẽ chuyển vào <strong>Thùng rác</strong> và không thể đăng nhập. Dữ liệu và lịch sử liên quan được giữ để admin tổng khôi phục khi cần.</p>
      <ul class="student-deletion-summary">
        ${[['enrollments','quyền học'],['orders','đơn đăng ký khóa'],['practiceSessions','lượt luyện tập'],['examAttempts','lượt thi thử'],['challenges','trận thách đấu'],['studentsCreated','học sinh đã tạo'],['questionsCreated','câu hỏi đã tạo'],['worksheetsCreated','bài tập đã tạo']].filter(([key]) => key in summary).map(([key,label]) => `<li>${count(summary[key])} ${label}</li>`).join('')}
      </ul>
      <div class="field"><label for="delete-confirm-username">Nhập lại tên đăng nhập (không có dấu @)</label>
        <input class="input" id="delete-confirm-username" name="accountConfirmation" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="20" required>
        <span class="hint">Gõ chính xác: <strong>${escapeHtml(student.username)}</strong>.</span></div>
      <div class="field"><label for="delete-student-reason">Lý do xóa</label>
        <textarea class="input student-deletion-reason-input" id="delete-student-reason" name="reason" minlength="5" maxlength="500" required></textarea></div>
      <label class="student-deletion-check" for="delete-student-acknowledge"><input id="delete-student-acknowledge" name="acknowledged" type="checkbox" required>
        <span>Tôi đã kiểm tra đúng tài khoản và hiểu tài khoản sẽ bị ngừng truy cập.</span></label>
      <div class="field"><label for="delete-admin-password">Mật khẩu hiện tại của admin tổng</label>
        <input class="input" id="delete-admin-password" name="adminPassword" type="password" autocomplete="current-password" minlength="6" maxlength="72" required></div>`;
    form.addEventListener('submit', event => event.preventDefault());
    const username = form.querySelector('#delete-confirm-username'), reason = form.querySelector('#delete-student-reason');
    const password = form.querySelector('#delete-admin-password'), acknowledged = form.querySelector('#delete-student-acknowledge');
    setupPasswordToggle(password);
    let busy = false, continueButton;
    const ready = () => username.value.trim() === student.username && reason.value.trim().length >= 5 && acknowledged.checked && password.value.length >= 6;
    const update = () => { if (continueButton) continueButton.disabled = busy || !ready(); };
    form.addEventListener('input', update);
    const modal = openModal({
      title: 'Xóa tài khoản: kiểm tra thông tin', content: form,
      actions: [
        { label: 'Hủy', className: 'btn btn-ghost', onClick: close => close() },
        { label: 'Tiếp tục kiểm tra', disabled: true, onClick: async (close, button) => {
          if (busy || !ready()) return;
          const errorBox = form.querySelector('#delete-student-error');
          errorBox.classList.add('hidden');
          busy = true; setBusy(button, true, 'Đang xác minh…');
          const requestedReason = reason.value.trim();
          try {
            const result = await api(`${basePath}/${id}/deletion-confirmation`, { method: 'POST', body: {
              username: username.value.trim(), reason: requestedReason, password: password.value, acknowledged: acknowledged.checked,
            } });
            password.value = '';
            if (!modal.backdrop.isConnected) return;
            const confirmation = result.data;
            if (!confirmation?.confirmationToken || !Number.isFinite(Date.parse(confirmation.notBefore)) || !Number.isFinite(Date.parse(confirmation.expiresAt))) {
              throw new Error('Chưa xác nhận được yêu cầu xóa. Bạn hãy thử lại.');
            }
            close();
            openFinalConfirmation(student, requestedReason, confirmation, basePath, onChanged);
          } catch (error) {
            password.value = '';
            if (modal.backdrop.isConnected) { showError(errorBox, error); errorBox.focus(); }
          } finally {
            busy = false;
            if (modal.backdrop.isConnected) { setBusy(button, false); update(); }
          }
        } },
      ],
    });
    continueButton = modal.backdrop.querySelector('.modal-actions .btn:last-child');
    continueButton.id = 'delete-continue-button';
    update();
    whenClosed(modal, () => { password.value = ''; form.reset(); });
  } catch (error) { toast(error.message, 'error'); }
}

function openFinalConfirmation(student, reason, confirmation, basePath, onChanged) {
  let token = confirmation.confirmationToken, busy = false;
  let notBefore = Math.max(Date.now() + 5_000, Date.parse(confirmation.notBefore));
  const expiresAt = Date.parse(confirmation.expiresAt), content = document.createElement('div');
  content.innerHTML = `<p class="eyebrow">Bước 2/2 · Xác nhận lần cuối</p>
    ${identity(student)}
    <p><strong>Lý do:</strong> ${escapeHtml(reason)}</p>
    <p>Bấm nút bên dưới sẽ chuyển đúng tài khoản này vào thùng rác. Bạn có thể khôi phục từ danh sách Thùng rác.</p>
    <p id="delete-final-countdown" class="student-deletion-countdown" role="status" aria-live="polite"></p>
    <div id="delete-final-error" class="form-error hidden" role="alert" tabindex="-1"></div>`;
  let deleteButton, timer;
  const update = () => {
    const expired = Date.now() >= expiresAt, remaining = Math.max(0, Math.ceil((notBefore - Date.now()) / 1000));
    if (expired) { token = ''; clearInterval(timer); }
    deleteButton.disabled = busy || !token || remaining > 0;
    content.querySelector('#delete-final-countdown').textContent = expired
      ? 'Yêu cầu đã hết hạn. Bạn hãy đóng hộp thoại và kiểm tra lại từ đầu.'
      : remaining ? `Vui lòng kiểm tra lại thông tin trong ${remaining} giây…` : 'Bạn đã có thể xác nhận xóa tài khoản.';
  };
  const modal = openModal({
    title: 'Xác nhận xóa tài khoản', content,
    actions: [
      { label: 'Hủy, giữ tài khoản', className: 'btn btn-ghost', onClick: close => close() },
      { label: 'Xóa tài khoản này', className: 'btn btn-danger', disabled: true, onClick: async (close, button) => {
        if (busy || !token || Date.now() < notBefore || Date.now() >= expiresAt) return;
        busy = true; setBusy(button, true, 'Đang chuyển vào thùng rác…');
        const errorBox = content.querySelector('#delete-final-error'); errorBox.classList.add('hidden');
        try {
          await api(`${basePath}/${student.id}`, { method: 'DELETE', body: { confirmationToken: token } });
          token = ''; close();
          toast('Đã chuyển tài khoản vào thùng rác. Bạn có thể khôi phục khi cần.', 'success');
          await onChanged?.();
        } catch (error) {
          const retry = Number(error.details?.retryAfterSeconds);
          if (Number.isFinite(retry) && retry > 0) notBefore = Date.now() + retry * 1000;
          if (modal.backdrop.isConnected) { showError(errorBox, error); errorBox.focus(); }
          else toast(error.message, 'error');
        } finally {
          busy = false;
          if (modal.backdrop.isConnected) { setBusy(button, false); update(); }
        }
      } },
    ],
  });
  deleteButton = modal.backdrop.querySelector('.modal-actions .btn:last-child');
  deleteButton.id = 'delete-final-button';
  update(); timer = setInterval(update, 200);
  whenClosed(modal, () => { clearInterval(timer); token = ''; });
}

export function openAccountRestore({ account: student, basePath, onChanged }) {
  if (!student) return;
  const content = document.createElement('div');
  content.innerHTML = `${identity(student)}<p>Khôi phục tài khoản và dữ liệu đã có. Trạng thái khóa trước khi xóa vẫn được giữ nguyên.</p><div class="form-error hidden" data-error role="alert"></div>`;
  let busy = false;
  const modal = openModal({ title: 'Khôi phục tài khoản', content, actions: [
    { label: 'Hủy', className: 'btn btn-ghost', onClick: close => close() },
    { label: 'Khôi phục tài khoản', onClick: async (close, button) => {
      if (busy) return;
      busy = true; setBusy(button, true, 'Đang khôi phục…');
      try {
        await api(`${basePath}/${student.id}/restore`, { method: 'POST' });
        close(); toast('Đã khôi phục tài khoản.', 'success'); await onChanged?.();
      } catch (error) {
        if (modal.backdrop.isConnected) showError(content.querySelector('[data-error]'), error); else toast(error.message, 'error');
      } finally { busy = false; if (modal.backdrop.isConnected) setBusy(button, false); }
    } },
  ] });
}
