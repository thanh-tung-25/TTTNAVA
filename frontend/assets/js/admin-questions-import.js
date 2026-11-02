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
import {store} from './admin-questions-context.js';

function statusLine(message) {
  const box = document.querySelector('[data-import-status]');
  if (!box) return;
  box.className = 'muted';
  box.textContent = message;
}

function previewHtml(config, tree, selectedIds) {
  const labels=selectedIds?scopeLabels(tree,selectedIds):null;
  const destination=labels?[tree.year.name,labels.grade,labels.semester,labels.subjectName,labels.chapterName,labels.lessonName].filter(Boolean).join(' › '):'';
  return `
    <div class="form-error hidden" data-error role="alert"></div>
    <p class="muted" style="font-size:.84rem;margin:0 0 .75rem">
      ${selectedIds?'Câu hỏi sẽ được lưu vào bài đã chọn bên ngoài.':'Chọn đúng cấp chương trình trước khi lưu.'} Câu hỏi nhập từ Word luôn được lưu ở trạng thái <strong>Nháp</strong>.
    </p>
    ${selectedIds?`<div class="worksheet-placement" data-import-destination><strong>Bài học nhận câu hỏi</strong><p>${escapeHtml(destination)}</p></div>`:scopeControlsHtml(tree, defaultScopeIds(tree))}
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
    const selected=store.selectedScope?.lessonId?structuredClone(store.selectedScope):null;
    if(document.body.dataset.contentHub==='unified'&&!selected)throw new Error('Chọn bài học ở ngoài trước khi nhập Word.');
    const [configPayload, treePayload] = await Promise.all([
      api('/api/v1/admin/questions/import/config'),
      api('/api/v1/admin/curriculum/tree'+(selected?.yearId?'?yearId='+encodeURIComponent(selected.yearId):'')),
    ]);
    const config = configPayload.data;
    const tree = treePayload.data;
    const selectedIds=selected?{yearId:selected.yearId,grade:selected.grade,semester:selected.semester,subjectId:selected.subjectId,chapterId:selected.chapterId,lessonId:selected.lessonId}:null;
    if(selectedIds){
      const grade=tree.grades.find(g=>g.grade===selectedIds.grade);
      const semester=grade?.semesters.find(s=>s.id===selectedIds.semester);
      const subject=semester?.subjects.find(s=>s.id===selectedIds.subjectId);
      const chapter=subject?.chapters.find(c=>c.id===selectedIds.chapterId);
      if(!chapter?.lessons.some(l=>l.id===selectedIds.lessonId))throw new Error('Bài học đã chọn không còn trong chương trình. Vui lòng chọn lại bài ở ngoài.');
    }
    const container = document.createElement('div');
    container.innerHTML = previewHtml(config, tree, selectedIds);
    const getIds=()=>selectedIds?{...selectedIds}:readScopeIds(container);
    let file = null;
    let extractedFile=null;
    let questions = [];
    const preview = container.querySelector('[data-preview]');
    const saveButton = container.querySelector('[data-save]');
    const aiPanel = container.querySelector('[data-ai-panel]');
    const errorBox = container.querySelector('[data-error]');
    const fileInput = container.querySelector('#docx-file');
    if(!selectedIds)bindScopeControls(container, tree, readScopeIds(container));

    fileInput.addEventListener('change', () => {
      file = fileInput.files[0] ?? null;
      extractedFile=null;questions=[];preview.replaceChildren();saveButton.disabled=true;aiPanel.classList.add('hidden');
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
      const readingFile=file;
      try {
        const formData = new FormData();
        formData.append('file', readingFile);
        const payload = await api('/api/v1/admin/questions/import/docx', { method: 'POST', body: formData });
        if(file!==readingFile)return;
        extractedFile=readingFile;
        if(!selectedIds)renderScopeSelects(container, tree, scopeIdsFromMetadata(tree, payload.data.metadata ?? {}));
        showQuestions(payload.data);
      } catch (error) {
        showError(errorBox, error);
      } finally {
        setBusy(event.currentTarget, false);
      }
    });

    container.querySelector('[data-ai]').addEventListener('click', async (event) => {
      if (!file || !config.ai.configured) return;
      const readingFile=file;
      const confirmed = await confirmAction(
        'Nội dung tệp sẽ được gửi tới dịch vụ AI đã cấu hình để tạo câu hỏi nháp. Cô đồng ý chứ?',
        { title: 'Tạo câu hỏi bằng AI', confirmText: 'Gửi tài liệu' },
      );
      if (!confirmed) return;
      setBusy(event.currentTarget, true, 'AI đang tạo…');
      try {
        const ids = getIds();
        const labels = scopeLabels(tree, ids);
        const formData = new FormData();
        formData.append('file', readingFile);
        formData.append('subjectName', labels.subjectName);
        formData.append('grade', String(ids.grade));
        formData.append('topicName', labels.lessonName);
        const payload = await api('/api/v1/admin/questions/import/ai', { method: 'POST', body: formData });
        if(file!==readingFile)return;
        extractedFile=readingFile;
        showQuestions(payload.data);
      } catch (error) {
        showError(errorBox, error);
      } finally {
        setBusy(event.currentTarget, false);
      }
    });

    saveButton.addEventListener('click', async () => {
      if (!questions.length||!extractedFile) return;
      const ids = getIds();
      if (!ids.lessonId) {
        showError(errorBox, new Error('Vui lòng chọn bài học trước khi lưu.'));
        return;
      }
      syncImportPreview(preview, questions);
      errorBox.classList.add('hidden');
      setBusy(saveButton, true, 'Đang lưu…');
      try {
        const body=new FormData();body.append('file',extractedFile);
        body.append('payload',JSON.stringify({
            ...ids,
            questions: questions.map(({ sourceNumber, issues, ...question }) => question),
          }));
        const result = await api('/api/v1/admin/questions/import/file', {method:'POST',body});
        toast(`Đã lưu ${result.data.created} câu hỏi nháp.`, 'success');
        document.dispatchEvent(new Event('content:changed'));
        document.querySelector('[data-close]')?.click();
          if(document.body.dataset.contentHub==='unified')return;
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
