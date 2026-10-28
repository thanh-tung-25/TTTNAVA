import { api, escapeHtml } from '/assets/js/api.js';
import { answerText, TYPE_LABELS } from '/assets/js/ui.js';
import {
  SUBJECTS,
  elements,
  requestCheck,
  store,
} from './practice-context.js';

function renderTabs() {
  elements.subjectTabs.innerHTML = SUBJECTS.map(([id, name, icon]) => (
    `<button class="tab" type="button" role="tab" data-subject="${id}" aria-selected="${id === store.subjectId}">${icon} ${name}</button>`
  )).join('');
}

export async function loadTopics() {
  renderTabs();
  elements.topicList.innerHTML = '<div class="loading">Đang tải chủ đề…</div>';
  try {
    const payload = await api(`/api/v1/catalog/topics?subjectId=${store.subjectId}&grade=${store.profile.grade}`);
    if (payload.data.length === 0) {
      elements.topicList.innerHTML = '<div class="empty">Chưa có chủ đề cho môn này.</div>';
      return;
    }
    const noPublished = payload.data.every((topic) => topic.questionCount === 0);
    elements.topicList.innerHTML = `
      ${noPublished ? '<div class="empty">Môn này chưa có câu hỏi nào được đăng. Con chờ cô giáo duyệt câu hỏi nhé!</div>' : ''}
      ${payload.data.map((topic, index) => {
        const enough = topic.questionCount >= 10;
        return `
          <div class="topic-item">
            <span class="topic-index">${index + 1}</span>
            <div>
              <h3>${escapeHtml(topic.name)}</h3>
              <p>${topic.questionCount} câu đã đăng · Lớp ${topic.grade}${enough ? '' : ' · cần 10 câu để luyện tập'}</p>
            </div>
            <button class="btn btn-sm" type="button" data-topic="${escapeHtml(topic.id)}"${enough ? '' : ' disabled'}>
              ${enough ? 'Học ngay' : 'Chưa đủ câu'}
            </button>
          </div>`;
      }).join('')}`;
  } catch (error) {
    elements.topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
  }
}

function optionClass(question, key) {
  if (question.isCorrect === undefined) {
    const isSelected = Array.isArray(store.selection)
      ? store.selection.includes(key)
      : store.selection === key;
    return isSelected ? 'option is-selected' : 'option';
  }
  const answer = question.correctAnswer ?? {};
  const correctKeys = question.type === 'multiple_choice' ? (answer.keys ?? []) : [answer.key];
  const selectedKeys = question.type === 'multiple_choice'
    ? (question.selected?.keys ?? [])
    : [question.selected?.key];
  if (correctKeys.includes(key)) return 'option is-correct';
  if (selectedKeys.includes(key)) return 'option is-wrong';
  return 'option';
}

function markAnswered(question) {
  const answer = question.correctAnswer ?? {};
  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    elements.answerArea.querySelectorAll('.option').forEach((node) => {
      node.className = optionClass(question, node.dataset.key);
      node.disabled = true;
    });
  } else if (question.type === 'true_false') {
    const selectedValue = question.selected?.value;
    const correctValue = Boolean(answer.value);
    elements.answerArea.querySelectorAll('.option').forEach((node) => {
      const value = node.dataset.value === 'true';
      node.className = 'option';
      if (value === correctValue) node.className = 'option is-correct';
      else if (value === selectedValue) node.className = 'option is-wrong';
      node.disabled = true;
    });
  } else {
    const input = elements.answerArea.querySelector('input');
    if (input) input.disabled = true;
  }

  elements.feedback.className = `feedback ${question.isCorrect ? 'is-correct' : 'is-wrong'}`;
  elements.feedback.innerHTML = `
    <strong>${question.isCorrect ? '✅ Đúng rồi!' : '❌ Chưa đúng rồi!'}</strong>
    <p style="margin:.15rem 0">Đáp án đúng: <b>${escapeHtml(answerText(question))}</b></p>
    <p style="margin:0">${escapeHtml(question.explanation ?? '')}</p>
  `;
}

export function renderQuestion() {
  const session = store.session;
  const question = session.questions[store.current];
  const answered = question.isCorrect !== undefined;
  store.selection = question.type === 'multiple_choice'
    ? [...(question.selected?.keys ?? [])]
    : question.type === 'single_choice'
      ? (question.selected?.key ?? null)
      : question.type === 'true_false'
        ? (question.selected?.value ?? null)
        : (question.selected?.value ?? '');

  document.getElementById('quiz-topic').textContent = session.topic.name;
  document.getElementById('quiz-progress').textContent = `Câu ${store.current + 1}/${session.questions.length}`;
  document.getElementById('quiz-bar').style.width = `${((store.current + 1) / session.questions.length) * 100}%`;
  document.getElementById('question-type').textContent = TYPE_LABELS[question.type] ?? '';
  document.getElementById('question-prompt').textContent = question.prompt;
  elements.feedback.classList.add('hidden');
  elements.feedback.className = 'feedback hidden';
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
      button.disabled = answered;
      button.addEventListener('click', () => {
        if (question.type === 'single_choice') store.selection = option.key;
        else store.selection = store.selection.includes(option.key)
          ? store.selection.filter((key) => key !== option.key)
          : [...store.selection, option.key];
        elements.answerArea.querySelectorAll('.option').forEach((node) => {
          node.classList.toggle('is-selected', optionClass(question, node.dataset.key).includes('is-selected'));
        });
      });
      list.append(button);
    }
    elements.answerArea.append(list);
  } else if (question.type === 'true_false') {
    const row = document.createElement('div');
    row.className = 'tf-row';
    for (const [value, label] of [[true, '✅ Đúng'], [false, '❌ Sai']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = store.selection === value && !answered ? 'option is-selected' : 'option';
      button.dataset.value = String(value);
      button.innerHTML = `<span>${label}</span>`;
      button.disabled = answered;
      button.addEventListener('click', () => {
        store.selection = value;
        row.querySelectorAll('.option').forEach((node) => { node.className = 'option'; });
        button.className = 'option is-selected';
      });
      row.append(button);
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
    input.disabled = answered;
    input.addEventListener('input', () => { store.selection = input.value; });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !answered) {
        event.preventDefault();
        requestCheck();
      }
    });
    row.append(input);
    elements.answerArea.append(row);
  }

  if (answered) {
    markAnswered(question);
    elements.checkButton.classList.add('hidden');
    elements.nextButton.classList.remove('hidden');
    elements.nextButton.textContent = store.current + 1 >= session.questions.length ? 'Xem kết quả 🎊' : 'Câu tiếp →';
    elements.nextButton.focus();
  } else {
    elements.checkButton.classList.remove('hidden');
    elements.checkButton.disabled = false;
    elements.checkButton.textContent = 'Kiểm tra';
    elements.nextButton.classList.add('hidden');
  }
}
