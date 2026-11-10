import { api } from '/assets/js/api.js';
import { setupPasswordToggle } from './password-toggle.js';

const byId = id => document.getElementById(id);
const availability = byId('registration-availability');
const content = byId('registration-content');
const errorBox = byId('registration-error');
const emailForm = byId('registration-email-form');
const accountStep = byId('registration-account-step');
const accountForm = byId('registration-account-form');
const emailInput = byId('registration-email');
const otpInput = byId('registration-otp');
const sendButton = byId('send-otp-button');
const resendButton = byId('resend-otp-button');
const changeEmailButton = byId('change-email-button');
const registerButton = byId('register-button');
let challengeId = '', recipient = '', expiresAt = 0, resendAt = 0, busy = false, timer;

setupPasswordToggle(byId('registration-password'));
setupPasswordToggle(byId('registration-password-confirm'));

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}
function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  errorBox.focus();
}
function updateTimers() {
  const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  const resendRemaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
  resendButton.disabled = busy || !challengeId || resendRemaining > 0;
  resendButton.textContent = resendRemaining ? `Gửi lại mã sau ${resendRemaining} giây` : 'Gửi lại mã';
  registerButton.disabled = busy || !challengeId || remaining === 0;
  byId('otp-expiry').textContent = !challengeId ? '' : remaining
    ? `Mã còn hiệu lực ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}.`
    : 'Mã đã hết hạn. Bạn hãy gửi lại mã để tiếp tục.';
}
function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  emailInput.disabled = value;
  changeEmailButton.disabled = value;
  accountForm.setAttribute('aria-busy', String(value));
  emailForm.setAttribute('aria-busy', String(value));
  updateTimers();
}
function showAccountStep(data, email) {
  challengeId = data.challengeId;
  recipient = email;
  expiresAt = Date.now() + Number(data.expiresIn || 300) * 1000;
  resendAt = Date.now() + Number(data.resendAfter || 60) * 1000;
  emailForm.hidden = true;
  accountStep.hidden = false;
  byId('email-step-label').removeAttribute('aria-current');
  byId('account-step-label').setAttribute('aria-current', 'step');
  byId('registration-sent-message').textContent = `Đã gửi mã xác minh tới ${recipient}.`;
  otpInput.value = '';
  clearInterval(timer);
  timer = setInterval(updateTimers, 1000);
  updateTimers();
  otpInput.focus();
}
function applyRetryDelay(error) {
  const retryAfter = Number(error.details?.retryAfter ?? error.details?.retryAfterSeconds);
  if (Number.isFinite(retryAfter) && retryAfter > 0) resendAt = Date.now() + retryAfter * 1000;
}
async function sendOtp(email) {
  const payload = await api('/api/v1/auth/register/request-otp', { method: 'POST', body: { email } });
  if (!payload?.data?.challengeId) throw new Error('Chưa nhận được xác nhận gửi mã. Bạn hãy thử lại.');
  showAccountStep(payload.data, email);
}

emailForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  clearError();
  const email = emailInput.value.trim().toLowerCase();
  if (!emailInput.checkValidity() || !/^[^@\s]+@gmail\.com$/.test(email)) {
    showError('Bạn hãy nhập địa chỉ Gmail hợp lệ, ví dụ tenban@gmail.com.');
    return;
  }
  setBusy(true);
  sendButton.textContent = 'Đang gửi mã…';
  try { await sendOtp(email); }
  catch (error) { applyRetryDelay(error); showError(error.message || 'Chưa gửi được mã xác minh. Bạn hãy thử lại.'); }
  finally { setBusy(false); sendButton.textContent = 'Gửi mã xác minh'; }
});

resendButton.addEventListener('click', async () => {
  if (busy || !challengeId || resendAt > Date.now()) return;
  clearError();
  setBusy(true);
  resendButton.textContent = 'Đang gửi lại…';
  try { await sendOtp(recipient); }
  catch (error) { applyRetryDelay(error); showError(error.message || 'Chưa gửi lại được mã. Bạn hãy thử lại.'); }
  finally { setBusy(false); }
});

changeEmailButton.addEventListener('click', () => {
  if (busy) return;
  clearError();
  clearInterval(timer);
  challengeId = '';
  recipient = '';
  expiresAt = 0;
  resendAt = 0;
  otpInput.value = '';
  byId('registration-password').value = '';
  byId('registration-password-confirm').value = '';
  emailForm.hidden = false;
  accountStep.hidden = true;
  byId('email-step-label').setAttribute('aria-current', 'step');
  byId('account-step-label').removeAttribute('aria-current');
  emailInput.focus();
});

accountForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !challengeId) return;
  clearError();
  const username = accountForm.username.value.trim();
  const displayName = accountForm.displayName.value.trim();
  const otp = otpInput.value.trim();
  const password = accountForm.password.value;
  if (!/^[0-9]{6}$/.test(otp)) return showError('Bạn hãy nhập đủ 6 số trong mã xác minh.');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return showError('Tên đăng nhập cần 3–20 ký tự: chữ thường, số và dấu gạch dưới.');
  if (!displayName) return showError('Bạn hãy nhập tên hiển thị.');
  if (password.length < 6 || password.length > 72) return showError('Mật khẩu cần từ 6 đến 72 ký tự.');
  if (password !== accountForm.passwordConfirm.value) return showError('Hai mật khẩu chưa giống nhau. Bạn hãy kiểm tra lại.');
  if (expiresAt <= Date.now()) return showError('Mã đã hết hạn. Bạn hãy gửi lại mã để tiếp tục.');
  setBusy(true);
  registerButton.textContent = 'Đang tạo tài khoản…';
  try {
    await api('/api/v1/auth/register', {
      method: 'POST',
      body: { challengeId, otp, username, displayName, password, accountKind:accountForm.accountKind.value,grade: accountForm.grade.value === '' ? null : Number(accountForm.grade.value) },
    });
    byId('registration-password').value = '';
    byId('registration-password-confirm').value = '';
    otpInput.value = '';
    localStorage.removeItem('ttnava-course');
    document.cookie = 'ttnava_course=; Path=/; Max-Age=0; SameSite=Lax';
    window.location.replace(accountForm.accountKind.value==='guardian'?'/pages/guardian/':'/pages/student/courses/');
  } catch (error) {
    applyRetryDelay(error);
    showError(error.message || 'Chưa tạo được tài khoản. Bạn hãy thử lại.');
    setBusy(false);
    registerButton.textContent = 'Xác minh và tạo tài khoản';
  }
});

window.addEventListener('pagehide', () => {
  clearInterval(timer);
  byId('registration-password').value = '';
  byId('registration-password-confirm').value = '';
  otpInput.value = '';
});

async function main() {
  try {
    const result = await api('/api/v1/auth/registration-status');
    if (!result.data?.available) {
      availability.textContent = 'Đăng ký tài khoản đang tạm thời chưa khả dụng. Bạn hãy quay lại sau hoặc đăng nhập nếu đã có tài khoản.';
      return;
    }
    availability.hidden = true;
    content.hidden = false;
  } catch {
    availability.textContent = 'Chưa kiểm tra được đăng ký. Bạn hãy tải lại trang hoặc thử lại sau.';
  }
}
main();
