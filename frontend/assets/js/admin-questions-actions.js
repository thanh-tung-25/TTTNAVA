import { api, escapeHtml, formatDate } from '/assets/js/api.js';
import {
  emptyState,
  openModal,
  setBusy,
  showError,
  toast,
} from '/assets/js/ui.js';
import {
  AUDIT_LABELS,
  elements,
  filters,
  row,
  store,
} from './admin-questions-context.js';
import {
  collectQuestionPayload,
  createQuestionForm,
} from './admin-question-form.js';

export async function loadSubjects() {
  if (store.subjects.length) return store.subjects;
  const payload = await api('/api/v1/catalog/subjects');
  store.subjects = payload.data;
  return store.subjects;
}

export async function load() {
  elements.table.innerHTML = '<div class="loading">Đang tải câu hỏi…</div>';
  const params = new URLSearchParams({ page: store.page, limit: 20 });
  for (const [key, value] of Object.entries(filters())) {
    if (value) params.set(key, value);
  }
  try {
    const payload = await api(`/api/v1/admin/questions?${params}`);
    store.totalPages = Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit));
    elements.table.innerHTML = payload.data.length
      ? `<div class="table-wrap"><table class="table admin-table">
          <thead><tr><th>Câu hỏi</th><th>Chủ đề</th><th>Loại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>${payload.data.map(row).join('')}</tbody>
        </table></div>`
      : emptyState('🔍', 'Chưa có câu hỏi phù hợp', 'Cô có thể thêm câu hỏi mới hoặc nhập từ tài liệu Word.');
    elements.pageLabel.textContent = `Trang ${store.page}/${store.totalPages} · ${payload.pagination.total} câu`;
    elements.prevButton.disabled = store.page <= 1;
    elements.nextButton.disabled = store.page >= store.totalPages;
  } catch (error) {
    elements.table.innerHTML = emptyState('😿', 'Không tải được câu hỏi', error.message);
  }
}

function auditBlock(payload) {
  const audit = document.createElement('div');
  audit.innerHTML = `
    <h3 style="margin-top:1rem">Lịch sử thay đổi</h3>
    ${payload.data.length
      ? `<ul class="audit-list">${payload.data.map((item) => `<li>${escapeHtml(AUDIT_LABELS[item.action] ?? item.action)} · ${escapeHtml(item.adminName)} · ${formatDate(item.createdAt)}</li>`).join('')}</ul>`
      : '<p class="muted" style="font-size:.82rem">Chưa có thay đổi nào.</p>'}`;
  return audit;
}

export async function openDetail(id) {
  try {
    const subjects = await loadSubjects();
    const [detailPayload, auditPayload] = await Promise.all([
      api(`/api/v1/admin/questions/${encodeURIComponent(id)}`),
      api(`/api/v1/admin/questions/${encodeURIComponent(id)}/audit`).catch(() => ({ data: [] })),
    ]);
    const question = detailPayload.data;
    const form = createQuestionForm(question, subjects);
    const content = document.createElement('div');
    const meta = document.createElement('p');
    meta.className = 'muted';
    meta.style.fontSize = '.8rem';
    meta.textContent = `${question.createdBy?.displayName ?? 'Không rõ người tạo'} tạo lúc ${formatDate(question.createdAt)}`
      + ` · Cập nhật bởi ${question.updatedBy?.displayName ?? 'chưa có'} lúc ${formatDate(question.updatedAt)}`;
    content.append(meta, form, auditBlock(auditPayload));

    openModal({
      title: 'Chi tiết câu hỏi',
      content,
      wide: true,
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
                body: collectQuestionPayload(form),
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

export async function openCreate() {
  try {
    const subjects = await loadSubjects();
    const form = createQuestionForm(null, subjects);
    openModal({
      title: 'Thêm câu hỏi mới',
      content: form,
      wide: true,
      actions: [
        { label: 'Đóng', className: 'btn btn-ghost', onClick: (close) => close() },
        {
          label: 'Lưu câu hỏi',
          onClick: async (close, button) => {
            const errorBox = form.querySelector('[data-error]');
            errorBox.classList.add('hidden');
            setBusy(button, true, 'Đang lưu…');
            try {
              const data = await api('/api/v1/admin/questions', {
                method: 'POST',
                body: collectQuestionPayload(form),
              });
              toast(data.data.status === 'published' ? 'Đã thêm và đăng câu hỏi.' : 'Đã lưu câu hỏi nháp.', 'success');
              close();
              store.page = 1;
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

function statusPayload(question, status) {
  return {
    topicId: question.topicId,
    subjectId: question.subjectId,
    grade: question.grade,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    imageUrl: question.imageUrl ?? null,
    status,
  };
}

export async function changeStatus(id, status) {
  try {
    const payload = await api(`/api/v1/admin/questions/${encodeURIComponent(id)}`);
    await api(`/api/v1/admin/questions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: statusPayload(payload.data, status),
    });
    toast(status === 'published' ? 'Đã đăng câu hỏi cho học sinh.' : 'Đã ẩn câu hỏi.', 'success');
    load();
  } catch (error) {
    toast(error.message, 'error');
  }
}
