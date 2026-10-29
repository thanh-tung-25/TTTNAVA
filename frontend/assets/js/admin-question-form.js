import { escapeHtml } from '/assets/js/api.js';
import { toast } from '/assets/js/ui.js';
import { DIFFICULTY_LABELS, TYPE_LABELS } from './admin-questions-context.js';
import {
  bindScopeControls,
  defaultScopeIds,
  readScopeIds,
  scopeControlsHtml,
} from './admin-question-scope.js';

const STATUS_LABELS = { draft: 'Nháp', published: 'Đã đăng', hidden: 'Đang ẩn' };
const DEFAULT_OPTIONS = [
  { key: 'a', text: '' }, { key: 'b', text: '' }, { key: 'c', text: '' }, { key: 'd', text: '' },
];

function optionRow(option, type, checked) {
  return `
    <div class="question-option-row" data-option-row data-option-key="${option.key}">
      <input type="${type === 'single_choice' ? 'radio' : 'checkbox'}"
             name="${type === 'single_choice' ? 'answerKey' : 'answerKeys'}"
             value="${option.key}"${checked ? ' checked' : ''}
             aria-label="Đáp án đúng ${option.key.toUpperCase()}">
      <span class="badge" data-option-label>${option.key.toUpperCase()}</span>
      <input class="input" data-option-text maxlength="500" value="${escapeHtml(option.text)}" placeholder="Nội dung phương án">
      <button class="icon-btn" type="button" data-remove-option aria-label="Xoá phương án">✕</button>
    </div>`;
}

function answerArea(type, question) {
  if (type === 'true_false') {
    return `
      <div class="field"><label>Đáp án đúng</label>
        <select class="select" data-answer-tf>
          <option value="true"${question.answer?.value !== false ? ' selected' : ''}>Đúng</option>
          <option value="false"${question.answer?.value === false ? ' selected' : ''}>Sai</option>
        </select>
      </div>`;
  }
  if (type === 'fill_in') {
    return `
      <div class="field"><label>Các đáp án được chấp nhận (mỗi dòng một đáp án)</label>
        <textarea class="textarea" rows="3" data-answer-fill maxlength="2000">${escapeHtml((question.answer?.accepted ?? []).join('\n'))}</textarea>
      </div>`;
  }
  const options = question.options?.length ? question.options : DEFAULT_OPTIONS;
  const answers = type === 'single_choice'
    ? [question.answer?.key ?? 'a']
    : (question.answer?.keys ?? []);
  return `
    <fieldset class="field" style="border:0;padding:0;margin:0 0 .85rem">
      <legend style="font-weight:600;font-size:.88rem;margin-bottom:.3rem">Phương án và đáp án đúng</legend>
      <div data-option-list>
        ${options.map((option) => optionRow(option, type, answers.includes(option.key))).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" type="button" data-add-option>+ Thêm phương án</button>
      <p class="hint">${type === 'single_choice' ? 'Chọn một đáp án đúng (2–4 phương án).' : 'Chọn 2 đáp án trở lên, không chọn tất cả (3–5 phương án).'}</p>
    </fieldset>`;
}

function reindexOptions(form) {
  form.querySelectorAll('[data-option-row]').forEach((row, index) => {
    const key = String.fromCharCode(97 + index);
    row.dataset.optionKey = key;
    row.querySelector('[data-option-label]').textContent = key.toUpperCase();
    row.querySelector('input[type="radio"], input[type="checkbox"]').value = key;
  });
}

function addOption(form) {
  const type = form.querySelector('[data-type]').value;
  const max = type === 'single_choice' ? 4 : 5;
  if (form.querySelectorAll('[data-option-row]').length >= max) {
    toast(`Loại câu này chỉ có tối đa ${max} phương án.`, 'error');
    return;
  }
  const key = String.fromCharCode(97 + form.querySelectorAll('[data-option-row]').length);
  form.querySelector('[data-option-list]').insertAdjacentHTML('beforeend', optionRow({ key, text: '' }, type, false));
}

function removeOption(form, row) {
  row.remove();
  reindexOptions(form);
}

function bindDynamicFields(form) {
  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-add-option]')) addOption(form);
    const remove = event.target.closest('[data-remove-option]');
    if (remove) removeOption(form, remove.closest('[data-option-row]'));
  });
  form.querySelector('[data-type]').addEventListener('change', (event) => {
    form.querySelector('[data-answer-area]').innerHTML = answerArea(event.target.value, {});
  });
}

export function createQuestionForm(question, tree) {
  const data = {
    type: 'single_choice', prompt: '', options: DEFAULT_OPTIONS, answer: { key: 'a' },
    explanation: '', difficulty: 'medium', status: 'draft', ...question,
  };
  const form = document.createElement('form');
  form.className = 'question-form';
  form.dataset.imageUrl = data.imageUrl ?? '';
  form.innerHTML = `
    <div class="form-error hidden" data-error role="alert"></div>
    ${scopeControlsHtml(tree, defaultScopeIds(tree, data))}
    <div class="grid grid-2">
      <div class="field"><label>Loại câu hỏi</label><select class="select" data-type>
        ${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}"${value === data.type ? ' selected' : ''}>${label}</option>`).join('')}
      </select></div>
      <div class="field"><label>Độ khó</label><select class="select" data-difficulty>
        ${Object.entries(DIFFICULTY_LABELS).map(([value, label]) => `<option value="${value}"${value === data.difficulty ? ' selected' : ''}>${label}</option>`).join('')}
      </select></div>
    </div>
    <div class="field"><label>Đề bài</label><textarea class="textarea" data-prompt maxlength="1000" rows="3" required>${escapeHtml(data.prompt)}</textarea></div>
    <div data-answer-area>${answerArea(data.type, data)}</div>
    <div class="field"><label>Lời giải</label><textarea class="textarea" data-explanation maxlength="4000" rows="3" required>${escapeHtml(data.explanation)}</textarea></div>
    <div class="field"><label>Trạng thái</label><select class="select" data-status>
      ${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}"${value === data.status ? ' selected' : ''}>${label}</option>`).join('')}
    </select><p class="hint">Học sinh chỉ nhận câu hỏi “Đã đăng”.</p></div>`;
  bindDynamicFields(form);
  bindScopeControls(form, tree, readScopeIds(form));
  return form;
}

export function collectQuestionPayload(form) {
  const type = form.querySelector('[data-type]').value;
  const payload = {
    ...readScopeIds(form),
    type,
    prompt: form.querySelector('[data-prompt]').value.trim(),
    explanation: form.querySelector('[data-explanation]').value.trim(),
    difficulty: form.querySelector('[data-difficulty]').value,
    status: form.querySelector('[data-status]').value,
    imageUrl: form.dataset.imageUrl || null,
    options: [],
    answer: {},
  };
  if (type === 'single_choice' || type === 'multiple_choice') {
    payload.options = [...form.querySelectorAll('[data-option-row]')].map((row) => ({
      key: row.dataset.optionKey,
      text: row.querySelector('[data-option-text]').value.trim(),
    }));
    if (type === 'single_choice') {
      payload.answer = { key: form.querySelector('input[name="answerKey"]:checked')?.value ?? '' };
    } else {
      payload.answer = {
        keys: [...form.querySelectorAll('input[name="answerKeys"]:checked')].map((input) => input.value),
      };
    }
  } else if (type === 'true_false') {
    payload.answer = { value: form.querySelector('[data-answer-tf]').value === 'true' };
  } else {
    payload.answer = {
      accepted: form.querySelector('[data-answer-fill]').value.split('\n').map((line) => line.trim()).filter(Boolean),
    };
  }
  if (!payload.lessonId) throw new Error('Vui lòng chọn bài học cho câu hỏi');
  return payload;
}
