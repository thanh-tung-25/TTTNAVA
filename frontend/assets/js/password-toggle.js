export function setupPasswordToggle(input, existingButton) {
  let wrapper = input.parentElement;
  if (!wrapper.classList.contains('password-control')) {
    wrapper = document.createElement('div');
    wrapper.className = 'password-control';
    input.before(wrapper);
    wrapper.append(input);
  }
  const button = existingButton || document.createElement('button');
  if (button.dataset.passwordReady) return button;
  button.dataset.passwordReady = 'true';
  button.type = 'button';
  button.classList.add('password-toggle');
  button.setAttribute('aria-controls', input.id);
  button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path data-password-slash d="M3 3l18 18" hidden/></svg>';
  wrapper.append(button);
  const update = visible => {
    input.type = visible ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    button.querySelector('[data-password-slash]').toggleAttribute('hidden', !visible);
  };
  update(false);
  button.addEventListener('click', () => update(input.type === 'password'));
  return button;
}
