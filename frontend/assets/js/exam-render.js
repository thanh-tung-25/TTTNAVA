import {loadExamCatalog} from './exam-catalog-view.js';
import {attachQuestionAudio,withChoiceAudio} from './question-audio.js';
import { api, escapeHtml } from '/assets/js/api.js';
import { TYPE_LABELS } from '/assets/js/ui.js';
import {subjectsFor} from './primary-subjects.js';
import {
  elements,
  store,
} from './exam-context.js';
import { flushSave, queueSave } from './exam-save.js';

function renderTabs() {
  const subjects=subjectsFor(store.profile);
  if(!subjects.some(([id])=>id===store.subjectId))store.subjectId=subjects[0][0];
  elements.subjectTabs.innerHTML = subjects.map(([id, name, icon]) => (
    `<button class="tab" type="button" role="tab" data-subject="${id}" aria-selected="${id === store.subjectId}">${icon} ${name}</button>`
  )).join('');
}

export async function loadTopics() {
  renderTabs();
  await loadExamCatalog();
}

function selectedKeysOf(question) {
  if (question.type === 'multiple_choice') return question.selected?.keys ?? [];
  if (question.type === 'single_choice') return question.selected?.key ? [question.selected.key] : [];
  return [];
}

function optionClass(question, key) {
  const selected = Array.isArray(store.selection)
    ? store.selection.includes(key)
    : store.selection === key;
  return selected ? 'option is-selected' : 'option';
}

export function renderPalette() {
  elements.palette.innerHTML = store.attempt.questions.map((question, index) => {
    const answered = question.type === 'multiple_choice'
      ? (question.selected?.keys?.length ?? 0) > 0
      : question.type === 'true_false'
        ? typeof question.selected?.value === 'boolean'
        : Boolean(question.selected?.value ?? question.selected?.key);
    const attrs = `class="tab${index === store.current ? ' is-current' : ''}" type="button" data-index="${index}"` +
      `${index === store.current ? ' aria-current="true" style="background:var(--primary);color:#fff;border-color:var(--primary)"' : ''}` +
      `${answered ? ' title="Đã làm"' : ''}`;
    return `<button ${attrs}>${index + 1}${answered ? ' ✓' : ''}</button>`;
  }).join('');
}

export function answeredCount() {
  return store.attempt.questions.filter((question) => {
    if (question.type === 'multiple_choice') return (question.selected?.keys?.length ?? 0) > 0;
    if (question.type === 'true_false') return typeof question.selected?.value === 'boolean';
    if (question.type === 'fill_in') return Boolean(question.selected?.value);
    return Boolean(question.selected?.key);
  }).length;
}

function updateAnsweredBadge() {
  document.getElementById('exam-answered').textContent =
    `Đã làm ${answeredCount()}/${store.attempt.questions.length}`;
}

export function renderQuestion() {
  const attempt = store.attempt;
  const question = attempt.questions[store.current];
  const answeredKeys = selectedKeysOf(question);
  store.selection = question.type === 'multiple_choice'
    ? [...answeredKeys]
    : question.type === 'single_choice'
      ? (answeredKeys[0] ?? null)
      : question.type === 'true_false'
        ? (question.selected?.value ?? null)
        : (question.selected?.value ?? '');

  document.getElementById('exam-topic').textContent = attempt.topic.name;
  document.getElementById('exam-progress').textContent = `Câu ${store.current + 1}/${attempt.questions.length}`;
  document.getElementById('exam-bar').style.width = `${((store.current + 1) / attempt.questions.length) * 100}%`;
  document.getElementById('question-type').textContent = TYPE_LABELS[question.type] ?? '';
  document.getElementById('question-prompt').textContent = question.prompt;
  attachQuestionAudio(document.getElementById('question-prompt'),question.prompt,{language:store.subjectId==='tieng-anh'?'en-US':'vi-VN'});
  document.getElementById('prev-button').disabled = store.current === 0;
  document.getElementById('next-button').disabled = store.current + 1 >= attempt.questions.length;
  elements.answerArea.replaceChildren();

  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    const list = document.createElement('div');
    list.className = 'options';
    for (const option of question.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = optionClass(question, option.key);
      button.dataset.key = option.key;
      button.innerHTML = `<span class="opt-key">${option.label}</span><span>${escapeHtml(option.text)}</span>`;
      button.addEventListener('click', () => {
        if (question.type === 'single_choice') store.selection = option.key;
        else store.selection = store.selection.includes(option.key)
          ? store.selection.filter((key) => key !== option.key)
          : [...store.selection, option.key];
        list.querySelectorAll('.option').forEach((node) => {
          node.className = optionClass(question, node.dataset.key);
        });
        queueSave();
      });
      list.append(withChoiceAudio(button,option.text,option.label,{language:store.subjectId==='tieng-anh'?'en-US':'vi-VN'}));
    }
    elements.answerArea.append(list);
  } else if (question.type === 'true_false') {
    const row = document.createElement('div');
    row.className = 'tf-row';
    for (const [value, label] of [[true, '✅ Đúng'], [false, '❌ Sai']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = store.selection === value ? 'option is-selected' : 'option';
      button.dataset.value = String(value);
      button.innerHTML = `<span>${label}</span>`;
      button.addEventListener('click', () => {
        store.selection = value;
        row.querySelectorAll('.option').forEach((node) => { node.className = 'option'; });
        button.className = 'option is-selected';
        queueSave();
      });
      row.append(withChoiceAudio(button,value?'Đúng':'Sai',value?'Đúng':'Sai'));
    }
    elements.answerArea.append(row);
  } else {
    const row = document.createElement('div');
    row.className = 'fill-row';
    const input = document.createElement('input');
    input.className = 'input';
    input.type = 'text';
    input.placeholder = 'Con nhập câu trả lời…';
    input.maxLength = 200;
    input.value = typeof store.selection === 'string' ? store.selection : '';
    input.addEventListener('input', () => {
      store.selection = input.value;
      queueSave();
    });
    input.addEventListener('blur', () => flushSave());
    row.append(input);
    elements.answerArea.append(row);
  }

  renderPalette();
  updateAnsweredBadge();
}
