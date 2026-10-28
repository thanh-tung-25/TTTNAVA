import { escapeHtml } from '/assets/js/api.js';
import { answerText, TYPE_LABELS } from '/assets/js/ui.js';
import { elements, requestRender, store } from './challenge-context.js';
import { submitAnswer } from './challenge-match-actions.js';

export function renderQuestionCard(question) {
  store.selection = question.type === 'multiple_choice' ? [] : question.type === 'single_choice' ? null : question.type === 'true_false' ? null : '';
  elements.matchBody.innerHTML = `
    <div class="progress" aria-hidden="true"><span id="match-bar"></span></div>
    <article class="card question-card">
      <span class="question-type">${TYPE_LABELS[question.type] ?? ''} · Câu ${store.match.myIndex + 1}</span>
      <h2 class="question-prompt" id="match-prompt"></h2>
      <div id="match-answer-area"></div>
      <div class="quiz-actions">
        <button class="btn" id="submit-answer" type="button">Trả lời</button>
      </div>
    </article>`;
  document.getElementById('match-prompt').textContent = question.prompt;
  document.getElementById('match-bar').style.width = '100%';
  const area = document.getElementById('match-answer-area');

  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    const list = document.createElement('div');
    list.className = 'options';
    for (const option of question.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.dataset.key = option.key;
      button.innerHTML = `<span class="opt-key">${option.label}</span><span>${escapeHtml(option.text)}</span>`;
      button.addEventListener('click', () => {
        if (question.type === 'single_choice') store.selection = option.key;
        else store.selection = store.selection.includes(option.key)
          ? store.selection.filter((key) => key !== option.key)
          : [...store.selection, option.key];
        list.querySelectorAll('.option').forEach((node) => {
          const selected = Array.isArray(store.selection)
            ? store.selection.includes(node.dataset.key)
            : store.selection === node.dataset.key;
          node.classList.toggle('is-selected', selected);
        });
      });
      list.append(button);
    }
    area.append(list);
  } else if (question.type === 'true_false') {
    const row = document.createElement('div');
    row.className = 'tf-row';
    for (const [value, label] of [[true, '✅ Đúng'], [false, '❌ Sai']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.dataset.value = String(value);
      button.textContent = label;
      button.addEventListener('click', () => {
        store.selection = value;
        row.querySelectorAll('.option').forEach((node) => { node.className = 'option'; });
        button.className = 'option is-selected';
      });
      row.append(button);
    }
    area.append(row);
  } else {
    const row = document.createElement('div');
    row.className = 'fill-row';
    const input = document.createElement('input');
    input.className = 'input';
    input.type = 'text';
    input.placeholder = 'Con nhập câu trả lời…';
    input.maxLength = 200;
    input.addEventListener('input', () => { store.selection = input.value; });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); submitAnswer(); }
    });
    row.append(input);
    area.append(row);
  }

  document.getElementById('submit-answer').addEventListener('click', submitAnswer);
}

export function renderFeedbackCard() {
  const feedback = store.feedback;
  const correct = feedback.isCorrect;
  elements.matchBody.innerHTML = `
    <article class="card">
      <div class="feedback ${correct ? 'is-correct' : 'is-wrong'}" style="margin:0">
        <strong>${correct ? '✅ Đúng rồi! +1 điểm' : '❌ Chưa đúng rồi!'}</strong>
        <p style="margin:.2rem 0">Đáp án đúng: <b>${escapeHtml(answerText({ ...feedback.question, correctAnswer: feedback.correctAnswer }))}</b></p>
        <p style="margin:0">${escapeHtml(feedback.explanation ?? '')}</p>
      </div>
      <div class="quiz-actions">
        <button class="btn" id="next-challenge-question" type="button">Câu tiếp →</button>
      </div>
    </article>`;
  document.getElementById('next-challenge-question').addEventListener('click', () => {
    store.feedback = null;
    requestRender();
  });
}
