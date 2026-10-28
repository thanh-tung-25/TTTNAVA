import { escapeHtml, toast } from './api.js';

export function openModal({ title, content, actions = [], onMount = null, wide = false }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
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
