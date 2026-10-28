import { escapeHtml } from '/assets/js/api.js';
import { toast } from '/assets/js/ui.js';
import { DIFFICULTY_LABELS, TYPE_LABELS } from './admin-questions-context.js';

const DEFAULT_OPTIONS = [
  { key: 'a', text: '' }, { key: 'b', text: '' }, { key: 'c', text: '' }, { key: 'd', text: '' },
];

function optionsFor(question) {
  return question.options?.length ? question.options : DEFAULT_OPTIONS;
}

function optionRows(question, index) {
  if (question.type !== 'single_choice' && question.type !== 'multiple_choice') return '';
  const options = optionsFor(question);
  const isSingle = question.type === 'single_choice';
  const selected = isSingle ? [question.answer?.key] : (question.answer?.keys ?? []);
  return options.map((option) => `
    <div class="question-option-row" data-option-row data-option-key="${option.key}">
      <input type="${isSingle ? 'radio' : 'checkbox'}" name="import-answer-${index}"
             value="${option.key}"${selected.includes(option.key) ? ' checked' : ''}>
      <span class="badge">${option.key.toUpperCase()}</span>
      <input class="input" data-option-text maxlength="500" value="${escapeHtml(option.text)}" placeholder="Nội dung phương án">
      <button class="icon-btn" type="button" data-remove-option aria-label="Xoá phương án">✕</button>
    </div>`).join('');
}

function answerEditor(question, index) {
  if (question.type === 'true_false') {
    return `<div class="field"><label>Đáp án đúng</label><select class="select" data-answer-tf>
      <option value="true"${question.answer?.value === true ? ' selected' : ''}>Đúng</option>
      <option value="false"${question.answer?.value === false ? ' selected' : ''}>Sai</option>
    </select></div>`;
  }
  if (question.type === 'fill_in') {
    return `<div class="field"><label>Đáp án được chấp nhận (mỗi dòng một đáp án)</label>
      <textarea class="textarea" rows="2" data-answer-fill>${escapeHtml((question.answer?.accepted ?? []).join('\n'))}</textarea>
    </div>`;
  }
  return `<div class="field"><label>Phương án và đáp án đúng</label>${optionRows(question, index)}
    <button class="btn btn-ghost btn-sm" type="button" data-add-option>+ Thêm phương án</button></div>`;
}

function card(question, index) {
  return `
    <details class="import-question-card" data-card data-index="${index}" open>
      <summary>
        <strong>Câu ${index + 1}</strong>
        <span class="badge ${question.issues.length ? 'badge-warning' : 'badge-success'}">
          ${question.issues.length ? `${question.issues.length} lỗi cần sửa` : 'Sẵn sàng'}
        </span>
      </summary>
      ${question.issues.length ? `<ul class="import-issues">${question.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')}</ul>` : ''}
      <div class="field"><label>Đề bài</label>
        <textarea class="textarea" rows="2" maxlength="1000" data-field="prompt">${escapeHtml(question.prompt)}</textarea></div>
      <div class="grid grid-2">
        <div class="field"><label>Loại câu</label><select class="select" data-field="type">
          ${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}"${value === question.type ? ' selected' : ''}>${label}</option>`).join('')}
        </select></div>
        <div class="field"><label>Độ khó</label><select class="select" data-field="difficulty">
          ${Object.entries(DIFFICULTY_LABELS).map(([value, label]) => `<option value="${value}"${value === question.difficulty ? ' selected' : ''}>${label}</option>`).join('')}
        </select></div>
      </div>
      <div data-answer-area>${answerEditor(question, index)}</div>
      <div class="field"><label>Lời giải</label>
        <textarea class="textarea" rows="2" maxlength="4000" data-field="explanation">${escapeHtml(question.explanation)}</textarea></div>
    </details>`;
}

function resetForType(question, type) {
  question.type = type;
  if (type === 'single_choice') {
    if (!question.options?.length) question.options = [...DEFAULT_OPTIONS];
    question.answer = { key: question.options[0]?.key ?? '' };
  } else if (type === 'multiple_choice') {
    if (!question.options?.length) question.options = [...DEFAULT_OPTIONS];
    question.answer = { keys: [] };
  } else if (type === 'true_false') {
    question.answer = { value: true };
  } else {
    question.answer = { accepted: [] };
  }
}

export function syncImportPreview(container, questions) {
  container.querySelectorAll('[data-card]').forEach((cardElement) => {
    const question = questions[Number(cardElement.dataset.index)];
    if (!question) return;
    question.prompt = cardElement.querySelector('[data-field="prompt"]').value.trim();
    question.type = cardElement.querySelector('[data-field="type"]').value;
    question.difficulty = cardElement.querySelector('[data-field="difficulty"]').value;
    question.explanation = cardElement.querySelector('[data-field="explanation"]').value.trim();
    if (question.type === 'single_choice' || question.type === 'multiple_choice') {
      question.options = [...cardElement.querySelectorAll('[data-option-row]')].map((row) => ({
        key: row.dataset.optionKey,
        text: row.querySelector('[data-option-text]').value.trim(),
      }));
      question.answer = question.type === 'single_choice'
        ? { key: cardElement.querySelector('input[type="radio"]:checked')?.value ?? '' }
        : { keys: [...cardElement.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value) };
    } else if (question.type === 'true_false') {
      question.answer = { value: cardElement.querySelector('[data-answer-tf]').value === 'true' };
    } else {
      question.answer = {
        accepted: cardElement.querySelector('[data-answer-fill]').value
          .split('\n').map((line) => line.trim()).filter(Boolean),
      };
    }
  });
}

function reindexOptions(question) {
  question.options.forEach((option, index) => { option.key = String.fromCharCode(97 + index); });
}

export function renderImportPreview(container, questions) {
  container.innerHTML = questions.map(card).join('');
  container.onchange = (event) => {
    if (event.target.matches('[data-field="type"]')) {
      syncImportPreview(container, questions);
      const index = Number(event.target.closest('[data-card]').dataset.index);
      resetForType(questions[index], event.target.value);
      renderImportPreview(container, questions);
    }
  };
  container.onclick = (event) => {
    const cardElement = event.target.closest('[data-card]');
    if (!cardElement) return;
    const question = questions[Number(cardElement.dataset.index)];
    if (event.target.closest('[data-add-option]')) {
      syncImportPreview(container, questions);
      if (question.options.length >= (question.type === 'single_choice' ? 4 : 5)) {
        toast('Đã đạt số phương án tối đa.', 'error');
        return;
      }
      question.options.push({ key: 'a', text: '' });
      reindexOptions(question);
      renderImportPreview(container, questions);
    }
    if (event.target.closest('[data-remove-option]')) {
      syncImportPreview(container, questions);
      const key = event.target.closest('[data-option-row]').dataset.optionKey;
      question.options = question.options.filter((option) => option.key !== key);
      reindexOptions(question);
      renderImportPreview(container, questions);
    }
  };
}
