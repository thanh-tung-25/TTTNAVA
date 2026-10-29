import { api, escapeHtml, toast } from '/assets/js/api.js';
import { confirmAction, openModal, setBusy, showError } from '/assets/js/ui.js';
import { loadQuestions } from './admin-questions-actions.js';
import {
  bindScopeControls,
  defaultScopeIds,
  readScopeIds,
  renderScopeSelects,
  scopeControlsHtml,
  scopeIdsFromMetadata,
  scopeLabels,
} from './admin-question-scope.js';
import { renderImportPreview, syncImportPreview } from './admin-import-preview.js';
import { findScope, loadTree, showScope } from './admin-questions-tree.js';

function statusLine(message) {
  const box = document.querySelector('[data-import-status]');
  if (!box) return;
  box.className = 'muted';
  box.textContent = message;
}

function previewHtml(config, tree) {
  return `
    <div class="form-error hidden" data-error role="alert"></div>
    <p class="muted" style="font-size:.84rem;margin:0 0 .75rem">
      Chọn đúng cấp chương trình trước khi lưu. Câu hỏi nhập từ Word luôn được lưu ở trạng thái <strong>Nháp</strong>.
    </p>
    ${scopeControlsHtml(tree, defaultScopeIds(tree))}
    <div class="field"><label for="docx-file">Tệp tài liệu .docx (tối đa 20 MB)</label>
      <input class="input" id="docx-file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
      <p class="hint">Mẫu: <strong>Câu 1.</strong> … <strong>A.</strong> … <strong>Đáp án:</strong> A · <strong>Lời giải:</strong> …</p>
    </div>
    <div class="quiz-actions" style="justify-content:flex-start">
      <button class="btn btn-ghost btn-sm" type="button" data-read>Đọc tệp Word</button>
      <a class="btn btn-ghost btn-sm" href="/assets/templates/mau-nhap-cau-hoi.docx" download>Tải file mẫu .docx</a>
    </div>
    <div class="muted" data-import-status style="margin:.75rem 0;font-size:.84rem"></div>
    <div data-ai-panel class="card hidden" style="margin:.75rem 0;padding:.9rem">
      <strong>Tài liệu chỉ có kiến thức?</strong>
      <p class="muted" style="font-size:.84rem">${escapeHtml(config.ai.message)}</p>
      <button class="btn btn-sm" type="button" data-ai ${config.ai.configured ? '' : 'disabled'}>
        ${config.ai.configured ? 'Tạo câu hỏi bằng AI từ tài liệu này' : 'AI chưa được cấu hình'}
      </button>
      <p class="hint">Chỉ khi bấm nút này, nội dung tài liệu mới được gửi tới dịch vụ AI đã cấu hình.</p>
    </div>
    <div data-preview></div>
    <div class="quiz-actions" style="justify-content:flex-end;margin-top:.75rem">
      <button class="btn" type="button" data-save disabled>Lưu tất cả dưới dạng nháp</button>
    </div>`;
}

export async function openImport() {
  try {
    const [configPayload, treePayload] = await Promise.all([
      api('/api/v1/admin/questions/import/config'),
      api('/api/v1/admin/curriculum/tree'),
    ]);
    const config = configPayload.data;
    const tree = treePayload.data;
    const container = document.createElement('div');
    container.innerHTML = previewHtml(config, tree);
    let file = null;
    let questions = [];
    const preview = container.querySelector('[data-preview]');
    const saveButton = container.querySelector('[data-save]');
    const aiPanel = container.querySelector('[data-ai-panel]');
    const errorBox = container.querySelector('[data-error]');
    const fileInput = container.querySelector('#docx-file');
    bindScopeControls(container, tree, readScopeIds(container));

    fileInput.addEventListener('change', () => {
      file = fileInput.files[0] ?? null;
      statusLine(file ? `Đã chọn ${file.name}` : 'Chưa chọn tệp.');
    });

    function showQuestions(data) {
      questions = data.questions ?? [];
      renderImportPreview(preview, questions);
      saveButton.disabled = questions.length === 0;
      aiPanel.classList.toggle('hidden', questions.length > 0);
      statusLine(`Đọc được ${questions.length} câu hỏi nháp.${data.extractionWarnings?.length ? ' Một số định dạng có thể bị bỏ qua.' : ''}`);
      if (data.issues?.length) {
        errorBox.classList.remove('hidden');
        errorBox.textContent = data.issues.join(' ');
      }
    }

    container.querySelector('[data-read]').addEventListener('click', async (event) => {
      if (!file) {
        showError(errorBox, new Error('Vui lòng chọn tệp .docx trước.'));
        return;
      }
      if (file.size > config.maxFileBytes) {
        showError(errorBox, new Error('Tệp .docx tối đa 20 MB.'));
        return;
      }
      errorBox.classList.add('hidden');
      setBusy(event.currentTarget, true, 'Đang đọc…');
      try {
        const formData = new FormData();
        formData.append('file', file);
        const payload = await api('/api/v1/admin/questions/import/docx', { method: 'POST', body: formData });
        renderScopeSelects(container, tree, scopeIdsFromMetadata(tree, payload.data.metadata ?? {}));
        showQuestions(payload.data);
      } catch (error) {
        showError(errorBox, error);
      } finally {
        setBusy(event.currentTarget, false);
      }
    });

    container.querySelector('[data-ai]').addEventListener('click', async (event) => {
      if (!file || !config.ai.configured) return;
      const confirmed = await confirmAction(
        'Nội dung tệp sẽ được gửi tới dịch vụ AI đã cấu hình để tạo câu hỏi nháp. Cô đồng ý chứ?',
        { title: 'Tạo câu hỏi bằng AI', confirmText: 'Gửi tài liệu' },
      );
      if (!confirmed) return;
      setBusy(event.currentTarget, true, 'AI đang tạo…');
      try {
        const ids = readScopeIds(container);
        const labels = scopeLabels(tree, ids);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subjectName', labels.subjectName);
        formData.append('grade', String(ids.grade));
        formData.append('topicName', labels.lessonName);
        const payload = await api('/api/v1/admin/questions/import/ai', { method: 'POST', body: formData });
        showQuestions(payload.data);
      } catch (error) {
        showError(errorBox, error);
      } finally {
        setBusy(event.currentTarget, false);
      }
    });

    saveButton.addEventListener('click', async () => {
      if (!questions.length) return;
      const ids = readScopeIds(container);
      if (!ids.lessonId) {
        showError(errorBox, new Error('Vui lòng chọn bài học trước khi lưu.'));
        return;
      }
      syncImportPreview(preview, questions);
      errorBox.classList.add('hidden');
      setBusy(saveButton, true, 'Đang lưu…');
      try {
        const result = await api('/api/v1/admin/questions/import', {
          method: 'POST',
          body: {
            ...ids,
            questions: questions.map(({ sourceNumber, issues, ...question }) => question),
          },
        });
        toast(`Đã lưu ${result.data.created} câu hỏi nháp.`, 'success');
        document.querySelector('[data-close]')?.click();
        const scope = findScope('lesson', ids.lessonId);
        if (scope) showScope(scope);
        await loadTree();
        await loadQuestions();
      } catch (error) {
        showError(errorBox, error);
        setBusy(saveButton, false);
      }
    });

    openModal({
      title: 'Nhập câu hỏi từ tài liệu Word',
      content: container,
      wide: true,
      actions: [{ label: 'Đóng', className: 'btn btn-ghost', onClick: (close) => close() }],
    });
  } catch (error) {
    toast(error.message, 'error');
  }
}
