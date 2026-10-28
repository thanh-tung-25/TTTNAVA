import { escapeHtml, formatDate } from '/assets/js/api.js';

export const elements = {
  table: document.getElementById('questions-table'),
  pageLabel: document.getElementById('page-label'),
  prevButton: document.getElementById('prev-page'),
  nextButton: document.getElementById('next-page'),
};

export const TYPE_LABELS = {
  single_choice: 'Một đáp án',
  multiple_choice: 'Nhiều đáp án',
  true_false: 'Đúng/Sai',
  fill_in: 'Điền',
};
export const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };
export const STATUS_LABELS = { draft: 'Nháp', published: 'Đã đăng', hidden: 'Đang ẩn' };
export const AUDIT_LABELS = {
  create: 'Tạo câu hỏi',
  update: 'Cập nhật',
  publish: 'Đăng câu hỏi',
  unpublish: 'Chuyển về nháp',
  hide: 'Ẩn câu hỏi',
  show: 'Hiện câu hỏi',
};

export const store = {
  page: 1,
  totalPages: 1,
  subjects: [],
};

export function filters() {
  return {
    subjectId: document.getElementById('filter-subject').value,
    grade: document.getElementById('filter-grade').value,
    type: document.getElementById('filter-type').value,
    status: document.getElementById('filter-status').value,
    q: document.getElementById('filter-q').value.trim(),
  };
}

export function statusBadge(status) {
  const className = status === 'published'
    ? 'badge-success'
    : status === 'draft' ? 'badge-warning' : 'badge-muted';
  return `<span class="badge ${className}">${STATUS_LABELS[status] ?? status}</span>`;
}

export function row(question) {
  const action = question.status === 'published'
    ? `<button class="btn btn-danger btn-sm" data-hide="${escapeHtml(question.id)}" type="button">Ẩn</button>`
    : `<button class="btn btn-ghost btn-sm" data-publish="${escapeHtml(question.id)}" type="button">${question.status === 'hidden' ? 'Đăng lại' : 'Đăng'}</button>`;
  const updated = question.updaterName
    ? `${escapeHtml(question.updaterName)} · ${formatDate(question.updatedAt)}`
    : formatDate(question.updatedAt);
  return `
    <tr>
      <td class="prompt-cell" title="${escapeHtml(question.prompt)}"><span>${escapeHtml(question.prompt)}</span></td>
      <td>${escapeHtml(question.topicName)}<br><span class="muted">Lớp ${question.grade} · ${escapeHtml(question.subjectName)}</span></td>
      <td>${TYPE_LABELS[question.type] ?? question.type}<br><span class="muted">${DIFFICULTY_LABELS[question.difficulty]}</span></td>
      <td>${statusBadge(question.status)}<br><span class="muted" style="font-size:.75rem">${updated}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-view="${escapeHtml(question.id)}" type="button">Xem / Sửa</button>
          ${action}
        </div>
      </td>
    </tr>`;
}
