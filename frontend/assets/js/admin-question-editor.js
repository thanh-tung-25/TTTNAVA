import { api, escapeHtml, formatDate } from '/assets/js/api.js';
import { openModal, setBusy, showError, toast } from '/assets/js/ui.js';
import { AUDIT_LABELS, store } from './admin-questions-context.js';
import { collectQuestionPayload, createQuestionForm } from './admin-question-form.js';
import { loadQuestions } from './admin-questions-list.js';
import { findScope, loadTree, showScope } from './admin-questions-tree.js';

function auditBlock(payload) {
  const audit = document.createElement('div');
  audit.innerHTML = `
    <h3 style="margin-top:1rem">Lịch sử thay đổi</h3>
    ${payload.data.length
      ? `<ul class="audit-list">${payload.data.map((item) => `<li>${escapeHtml(AUDIT_LABELS[item.action] ?? item.action)} · ${escapeHtml(item.adminName)} · ${formatDate(item.createdAt)}</li>`).join('')}</ul>`
      : '<p class="muted" style="font-size:.82rem">Chưa có thay đổi nào.</p>'}`;
  return audit;
}

async function ensureTree() {
  if (!store.tree) await loadTree();
  return store.tree;
}

function selectedFields() {
  if (!store.selectedScope) return null;
  return {
    yearId: store.selectedScope.yearId,
    grade: store.selectedScope.grade,
    semester: store.selectedScope.semester,
    subjectId: store.selectedScope.subjectId,
    chapterId: store.selectedScope.chapterId,
    lessonId: store.selectedScope.lessonId,
  };
}

async function afterSave(data) {
  const scope = findScope('lesson', data.lessonId);
  if (scope) {
    store.page = 1;
    showScope(scope);
  }
  await loadTree();
  await loadQuestions();
}

export async function openDetail(id) {
  try {
    const tree = await ensureTree();
    const [detailPayload, auditPayload] = await Promise.all([
      api(`/api/v1/admin/questions/${encodeURIComponent(id)}`),
      api(`/api/v1/admin/questions/${encodeURIComponent(id)}/audit`).catch(() => ({ data: [] })),
    ]);
    const question = detailPayload.data;
    const form = createQuestionForm(question, tree);
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
              const payload = await api(`/api/v1/admin/questions/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: collectQuestionPayload(form),
              });
              toast('Đã lưu câu hỏi.', 'success');
              close();
              await afterSave(payload.data);
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
    const tree = await ensureTree();
    const form = createQuestionForm(selectedFields(), tree);
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
              const payload = await api('/api/v1/admin/questions', {
                method: 'POST',
                body: collectQuestionPayload(form),
              });
              toast(payload.data.status === 'published' ? 'Đã thêm và đăng câu hỏi.' : 'Đã lưu câu hỏi nháp.', 'success');
              close();
              await afterSave(payload.data);
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
    ...(question.lessonId ? { lessonId: question.lessonId } : { topicId: question.topicId }),
    subjectId: question.subjectId,
    grade: question.grade,
    semester: question.semester,
    chapterId: question.chapterId ?? undefined,
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
    await loadTree();
    await loadQuestions();
  } catch (error) {
    toast(error.message, 'error');
  }
}
