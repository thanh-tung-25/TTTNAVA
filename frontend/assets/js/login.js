import { api, ApiError } from '/assets/js/api.js';

const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const button = document.getElementById('login-button');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function destinationFor(profile) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  const fallback = profile.role === 'admin' ? '/pages/admin/students/' : '/pages/student/home/';
  if (!next || !next.startsWith('/pages/')) return fallback;
  if (profile.role === 'admin' && next.startsWith('/pages/admin/')) return next;
  if (profile.role === 'student' && next.startsWith('/pages/student/')) return next;
  return fallback;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.add('hidden');
  const username = form.username.value.trim();
  const password = form.password.value;
  if (!username || !password) {
    showError('Con hãy nhập đầy đủ tên đăng nhập và mật khẩu nhé!');
    return;
  }

  button.disabled = true;
  button.textContent = 'Đang mở cửa lớp…';
  try {
    const payload = await api('/api/v1/auth/login', { method: 'POST', body: { username, password } });
    window.location.replace(destinationFor(payload.data.profile));
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      showError('Con thử lại sau một phút nhé!');
    } else {
      showError(error.message ?? 'Không đăng nhập được, con thử lại nhé!');
    }
    button.disabled = false;
    button.textContent = 'Vào học thôi! 🚀';
    form.password.select();
  }
});
