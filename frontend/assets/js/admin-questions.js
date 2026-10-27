import { api, escapeHtml, formatDate } from '/assets/js/api.js';
import {
  emptyState,
  initPage,
  openModal,
  setBusy,
  showError,
  toast,
} from '/assets/js/ui.js';

const tableEl = document.getElementById('questions-table');
const pageLabel = document.getElementById('page-label');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');

const TYPE_LABELS = {
  single_choice: 'Một đáp án',
  multiple_choice: 'Nhiều đáp án',
  true_false: 'Đúng/Sai',
  fill_in: 'Điền',
};
const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };
const STATUS_LABELS = { visible: 'Đang hiện', hidden: 'Đang ẩn' };

let page = 1;
let totalPages = 1;

function filters() {
  return {
    subjectId: document.getElementById('filter-subject').value,
    grade: document.getElementById('filter-grade').value,
    type: document.getElementById('filter-type').value,
    status: document.getElementById('filter-status').value,
    q: document.getElementById('filter-q').value.trim(),
  };
}

function row(question) {
  const statusBadge = question.status === 'visible'
    ? '<span class="badge badge-success">Đang hiện</span>'
    : '<span class="badge badge-muted">Đang ẩn</span>';
  return `
    <tr>
      <td class="prompt-cell" title="${escapeHtml(question.prompt)}"><span>${escapeHtml(question.prompt)}</span></td>
      <td>${escapeHtml(question.topicName)}<br><span class="muted">Lớp ${question.grade} · ${escapeHtml(question.subjectName)}</span></td>
      <td>${TYPE_LABELS[question.type] ?? question.type}<br><span class="muted">${DIFFICULTY_LABELS[question.difficulty]}</span></td>
      <td>${statusBadge}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-view="${escapeHtml(question.id)}" type="button">Xem / Sửa</button>
          <button class="btn ${question.status === 'visible' ? 'btn-danger' : 'btn-ghost'} btn-sm"
                  data-toggle="${escapeHtml(question.id)}" data-status="${question.status}" type="button">
            ${question.status === 'visible' ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
      </td>
    </tr>`;
}

async function load() {
  tableEl.innerHTML = '<div class="loading">Đang tải câu hỏi…</div>';
  const params = new URLSearchParams({ page, limit: 20 });
  for (const [key, value] of Object.entries(filters())) {
    if (value) params.set(key, value);
  }
  try {
    const payload = await api(`/api/v1/admin/questions?${params}`);
    totalPages = Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit));
    tableEl.innerHTML = payload.data.length
      ? `<div class="table-wrap"><table class="table admin-table">
          <thead><tr><th>Câu hỏi</th><th>Chủ đề</th><th>Loại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>${payload.data.map(row).join('')}</tbody>
        </table></div>`
      : emptyState('🔍', 'Không tìm thấy câu hỏi', 'Con thử đổi bộ lọc xem sao.');
    pageLabel.textContent = `Trang ${page}/${totalPages} · ${payload.pagination.total} câu`;
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  } catch (error) {
    tableEl.innerHTML = emptyState('😿', 'Không tải được câu hỏi', error.message);
  }
}

function optionEditor(question) {
  if (question.type !== 'single_choice' && question.type !== 'multiple_choice') return '';
  const isSingle = question.type === 'single_choice';
  const answers = isSingle ? [question.answer?.key] : (question.answer?.keys ?? []);
  return `
    <fieldset class="field" style="border:0;padding:0;margin:0 0 .85rem">
      <legend style="font-weight:600;font-size:.88rem;margin-bottom:.3rem">Phương án và đáp án đúng</legend>
      ${question.options.map((option) => `
        <div style="display:flex;align-items:center;gap:.45rem;margin-bottom:.35rem">
          <input type="${isSingle ? 'radio' : 'checkbox'}" name="${isSingle ? 'answerKey' : 'answerKeys'}"
                 value="${option.key}"${answers.includes(option.key) ? ' checked' : ''}
                 aria-label="Đáp án đúng ${option.key.toUpperCase()}">
          <span class="badge">${option.key.toUpperCase()}</span>
          <input class="input" data-option-key="${option.key}" value="${escapeHtml(option.text)}" maxlength="500" required>
        </div>`).join('')}
      <span class="hint">${isSingle ? 'Chọn một đáp án đúng.' : 'Chọn từ 2 đáp án đúng trở lên, không chọn tất cả.'}</span>
    </fieldset>`;
}

function answerEditor(question) {
  if (question.type === 'true_false') {
    return `
      <div class="field"><label for="edit-answer-tf">Đáp án đúng</label>
        <select class="select" id="edit-answer-tf">
          <option value="true"${question.answer?.value ? ' selected' : ''}>Đúng</option>
          <option value="false"${question.answer?.value ? '' : ' selected'}>Sai</option>
        </select></div>`;
  }
  if (question.type === 'fill_in') {
    return `
      <div class="field"><label for="edit-answer-fill">Các đáp án được chấp nhận (mỗi dòng một đáp án)</label>
        <textarea class="textarea" id="edit-answer-fill" rows="3">${escapeHtml((question.answer?.accepted ?? []).join('\n'))}</textarea></div>`;
  }
  return '';
}

function editForm(question) {
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="form-error hidden" data-error role="alert"></div>
    <p class="muted" style="font-size:.8rem;margin:0 0 .6rem">
      ${escapeHtml(question.topicName)} · Lớp ${question.grade} · ${TYPE_LABELS[question.type]}
    </p>
    <div class="field"><label for="edit-prompt">Đề bài</label>
      <textarea class="textarea" id="edit-prompt" maxlength="1000" rows="3" required>${escapeHtml(question.prompt)}</textarea></div>
    ${optionEditor(question)}
    ${answerEditor(question)}
    <div class="field"><label for="edit-explanation">Lời giải</label>
      <textarea class="textarea" id="edit-explanation" maxlength="4000" rows="3" required>${escapeHtml(question.explanation)}</textarea></div>
    <div class="grid grid-2">
      <div class="field"><label for="edit-difficulty">Độ khó</label>
        <select class="select" id="edit-difficulty">
          ${['easy', 'medium', 'hard'].map((level) => `<option value="${level}"${level === question.difficulty ? ' selected' : ''}>${DIFFICULTY_LABELS[level]}</option>`).join('')}
        </select></div>
      <div class="field"><label for="edit-status">Trạng thái</label>
        <select class="select" id="edit-status">
          <option value="visible"${question.status === 'visible' ? ' selected' : ''}>Đang hiện</option>
          <option value="hidden"${question.status === 'hidden' ? ' selected' : ''}>Đang ẩn</option>
        </select></div>
    </div>`;
  return form;
}

function collectPayload(form, question) {
  const payload = {
    prompt: form.querySelector('#edit-prompt').value.trim(),
    explanation: form.querySelector('#edit-explanation').value.trim(),
    difficulty: form.querySelector('#edit-difficulty').value,
    status: form.querySelector('#edit-status').value,
    imageUrl: question.imageUrl ?? null,
    options: [],
    answer: {},
  };
  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    payload.options = [...form.querySelectorAll('[data-option-key]')].map((input) => ({
      key: input.dataset.optionKey,
      text: input.value.trim(),
    }));
    if (question.type === 'single_choice') {
      payload.answer = { key: form.querySelector('input[name="answerKey"]:checked')?.value ?? '' };
    } else {
      payload.answer = { keys: [...form.querySelectorAll('input[name="answerKeys"]:checked')].map((input) => input.value) };
    }
  } else if (question.type === 'true_false') {
    payload.answer = { value: form.querySelector('#edit-answer-tf').value === 'true' };
  } else {
    payload.answer = {
      accepted: form.querySelector('#edit-answer-fill').value.split('\n').map((line) => line.trim()).filter(Boolean),
    };
  }
  return payload;
}

async function openDetail(id) {
  try {
    const [detailPayload, auditPayload] = await Promise.all([
      api(`/api/v1/admin/questions/${encodeURIComponent(id)}`),
      api(`/api/v1/admin/questions/${encodeURIComponent(id)}/audit`).catch(() => ({ data: [] })),
    ]);
    const question = detailPayload.data;
    const form = editForm(question);
    const audit = document.createElement('div');
    audit.innerHTML = `
      <h3 style="margin-top:1rem">Lịch sử thay đổi</h3>
      ${auditPayload.data.length
        ? `<ul class="audit-list">${auditPayload.data.map((item) => `<li>${escapeHtml(item.action)} · ${escapeHtml(item.adminName)} · ${formatDate(item.createdAt)}</li>`).join('')}</ul>`
        : '<p class="muted" style="font-size:.82rem">Chưa có thay đổi nào.</p>'}`;

    const content = document.createElement('div');
    content.append(form, audit);

    const modal = openModal({
      title: 'Chi tiết câu hỏi',
      content,
      actions: [
        { label: 'Đóng', className: 'btn btn-ghost', onClick: (close) => close() },
        {
          label: 'Lưu thay đổi',
          onClick: async (close, button) => {
            const errorBox = form.querySelector('[data-error]');
            errorBox.classList.add('hidden');
            setBusy(button, true, 'Đang lưu…');
            try {
              await api(`/api/v1/admin/questions/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: collectPayload(form, question),
              });
              toast('Đã lưu câu hỏi.', 'success');
              close();
              load();
            } catch (error) {
              showError(errorBox, error);
              errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

async function toggleStatus(id, current) {
  const next = current === 'visible' ? 'hidden' : 'visible';
  try {
    const payload = await api(`/api/v1/admin/questions/${encodeURIComponent(id)}`);
    const question = payload.data;
    await api(`/api/v1/admin/questions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: {
        prompt: question.prompt,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
        difficulty: question.difficulty,
        imageUrl: question.imageUrl ?? null,
        status: next,
      },
    });
    toast(next === 'hidden' ? 'Đã ẩn câu hỏi.' : 'Đã hiện câu hỏi.', 'success');
    load();
  } catch (error) {
    toast(error.message, 'error');
  }
}

tableEl.addEventListener('click', (event) => {
  const view = event.target.closest('[data-view]');
  const toggle = event.target.closest('[data-toggle]');
  if (view) openDetail(view.dataset.view);
  else if (toggle) toggleStatus(toggle.dataset.toggle, toggle.dataset.status);
});

document.getElementById('filter-button').addEventListener('click', () => { page = 1; load(); });
document.getElementById('filter-q').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); page = 1; load(); }
});
prevButton.addEventListener('click', () => { if (page > 1) { page -= 1; load(); } });
nextButton.addEventListener('click', () => { if (page < totalPages) { page += 1; load(); } });

async function main() {
  await initPage('admin', 'questions');
  await load();
}

main().catch((error) => {
  tableEl.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
