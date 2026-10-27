import { api, escapeHtml } from '/assets/js/api.js';
import {
  answerText,
  confirmAction,
  getProfile,
  initPage,
  praiseFor,
  syncDiamondTotal,
  TYPE_LABELS,
} from '/assets/js/ui.js';

const SUBJECTS = [
  ['toan', 'Toán', '🔢'],
  ['tieng-viet', 'Tiếng Việt', '📖'],
  ['tieng-anh', 'Tiếng Anh', '🌍'],
];

const setupView = document.getElementById('setup-view');
const quizView = document.getElementById('quiz-view');
const resultView = document.getElementById('result-view');
const topicList = document.getElementById('topic-list');
const subjectTabs = document.getElementById('subject-tabs');
const answerArea = document.getElementById('answer-area');
const feedback = document.getElementById('feedback');
const checkButton = document.getElementById('check-button');
const nextButton = document.getElementById('next-button');

let profile = null;
let subjectId = 'toan';
let session = null;
let current = 0;
let selection = null;
let busy = false;

function subjectFromUrl() {
  const value = new URLSearchParams(window.location.search).get('subject');
  return SUBJECTS.some(([id]) => id === value) ? value : 'toan';
}

function renderTabs() {
  subjectTabs.innerHTML = SUBJECTS.map(([id, name, icon]) => (
    `<button class="tab" type="button" role="tab" data-subject="${id}" aria-selected="${id === subjectId}">${icon} ${name}</button>`
  )).join('');
}

async function loadTopics() {
  renderTabs();
  topicList.innerHTML = '<div class="loading">Đang tải chủ đề…</div>';
  try {
    const payload = await api(`/api/v1/catalog/topics?subjectId=${subjectId}&grade=${profile.grade}`);
    if (payload.data.length === 0) {
      topicList.innerHTML = '<div class="empty">Chưa có chủ đề cho môn này.</div>';
      return;
    }
    topicList.innerHTML = payload.data.map((topic, index) => `
      <div class="topic-item">
        <span class="topic-index">${index + 1}</span>
        <div><h3>${escapeHtml(topic.name)}</h3><p>${topic.questionCount} câu hỏi · Lớp ${topic.grade}</p></div>
        <button class="btn btn-sm" type="button" data-topic="${escapeHtml(topic.id)}">Học ngay</button>
      </div>
    `).join('');
  } catch (error) {
    topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
  }
}

function show(view) {
  for (const section of [setupView, quizView, resultView]) section.classList.add('hidden');
  view.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function startPractice(topicId, button) {
  button.disabled = true;
  button.textContent = 'Đang mở…';
  try {
    const payload = await api('/api/v1/practice', { method: 'POST', body: { topicId } });
    session = payload.data;
    current = session.currentIndex ?? 0;
    show(quizView);
    renderQuestion();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Học ngay';
    window.alert(error.message);
  }
}

function optionClass(question, key) {
  if (question.isCorrect === undefined) {
    const isSelected = Array.isArray(selection) ? selection.includes(key) : selection === key;
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

function renderQuestion() {
  const question = session.questions[current];
  const answered = question.isCorrect !== undefined;
  selection = question.type === 'multiple_choice'
    ? [...(question.selected?.keys ?? [])]
    : question.type === 'single_choice'
      ? (question.selected?.key ?? null)
      : question.type === 'true_false'
        ? (question.selected?.value ?? null)
        : (question.selected?.value ?? '');

  document.getElementById('quiz-topic').textContent = session.topic.name;
  document.getElementById('quiz-progress').textContent = `Câu ${current + 1}/${session.questions.length}`;
  document.getElementById('quiz-bar').style.width = `${((current + 1) / session.questions.length) * 100}%`;
  document.getElementById('question-type').textContent = TYPE_LABELS[question.type] ?? '';
  document.getElementById('question-prompt').textContent = question.prompt;
  feedback.classList.add('hidden');
  feedback.className = 'feedback hidden';
  answerArea.replaceChildren();

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
        if (question.type === 'single_choice') selection = option.key;
        else selection = selection.includes(option.key)
          ? selection.filter((key) => key !== option.key)
          : [...selection, option.key];
        answerArea.querySelectorAll('.option').forEach((node) => {
          node.classList.toggle('is-selected', optionClass(question, node.dataset.key).includes('is-selected'));
        });
      });
      list.append(button);
    }
    answerArea.append(list);
  } else if (question.type === 'true_false') {
    const row = document.createElement('div');
    row.className = 'tf-row';
    for (const [value, label] of [[true, '✅ Đúng'], [false, '❌ Sai']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = selection === value && !answered ? 'option is-selected' : 'option';
      button.dataset.value = String(value);
      button.innerHTML = `<span>${label}</span>`;
      button.disabled = answered;
      button.addEventListener('click', () => {
        selection = value;
        row.querySelectorAll('.option').forEach((node) => { node.className = 'option'; });
        button.className = 'option is-selected';
      });
      row.append(button);
    }
    answerArea.append(row);
  } else {
    const row = document.createElement('div');
    row.className = 'fill-row';
    const input = document.createElement('input');
    input.className = 'input';
    input.type = 'text';
    input.placeholder = 'Con nhập câu trả lời…';
    input.maxLength = 200;
    input.value = typeof selection === 'string' ? selection : '';
    input.disabled = answered;
    input.addEventListener('input', () => { selection = input.value; });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !answered) {
        event.preventDefault();
        checkAnswer();
      }
    });
    row.append(input);
    answerArea.append(row);
  }

  if (answered) {
    markAnswered(question);
    checkButton.classList.add('hidden');
    nextButton.classList.remove('hidden');
    nextButton.textContent = current + 1 >= session.questions.length ? 'Xem kết quả 🎊' : 'Câu tiếp →';
    nextButton.focus();
  } else {
    checkButton.classList.remove('hidden');
    checkButton.disabled = false;
    checkButton.textContent = 'Kiểm tra';
    nextButton.classList.add('hidden');
  }
}

function markAnswered(question) {
  const answer = question.correctAnswer ?? {};
  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    answerArea.querySelectorAll('.option').forEach((node) => {
      node.className = optionClass(question, node.dataset.key);
      node.disabled = true;
    });
  } else if (question.type === 'true_false') {
    const selectedValue = question.selected?.value;
    const correctValue = Boolean(answer.value);
    answerArea.querySelectorAll('.option').forEach((node) => {
      const value = node.dataset.value === 'true';
      node.className = 'option';
      if (value === correctValue) node.className = 'option is-correct';
      else if (value === selectedValue) node.className = 'option is-wrong';
      node.disabled = true;
    });
  } else {
    const input = answerArea.querySelector('input');
    if (input) input.disabled = true;
  }

  feedback.className = `feedback ${question.isCorrect ? 'is-correct' : 'is-wrong'}`;
  feedback.innerHTML = `
    <strong>${question.isCorrect ? '✅ Đúng rồi!' : '❌ Chưa đúng rồi!'}</strong>
    <p style="margin:.15rem 0">Đáp án đúng: <b>${escapeHtml(answerText(question))}</b></p>
    <p style="margin:0">${escapeHtml(question.explanation ?? '')}</p>
  `;
}

async function checkAnswer() {
  if (busy) return;
  const question = session.questions[current];
  let answer;
  if (question.type === 'single_choice') {
    if (!selection) return window.alert('Con hãy chọn một đáp án nhé!');
    answer = { key: selection };
  } else if (question.type === 'multiple_choice') {
    if (!selection.length) return window.alert('Con hãy chọn ít nhất một đáp án nhé!');
    answer = { keys: selection };
  } else if (question.type === 'true_false') {
    if (selection === null) return window.alert('Con hãy chọn Đúng hoặc Sai nhé!');
    answer = { value: selection };
  } else {
    if (!String(selection ?? '').trim()) return window.alert('Con hãy nhập câu trả lời nhé!');
    answer = { value: String(selection).trim() };
  }

  busy = true;
  checkButton.disabled = true;
  checkButton.textContent = 'Đang chấm…';
  try {
    const payload = await api(`/api/v1/practice/${session.id}/answers`, {
      method: 'POST',
      body: { questionId: question.id, answer },
    });
    session = payload.data.state;
    renderQuestion();
  } catch (error) {
    window.alert(error.message);
    checkButton.disabled = false;
    checkButton.textContent = 'Kiểm tra';
  } finally {
    busy = false;
  }
}

async function finishPractice() {
  try {
    const payload = await api(`/api/v1/practice/${session.id}/finish`, { method: 'POST' });
    const result = payload.data;
    syncDiamondTotal();
    const praise = praiseFor(result.percent);
    document.getElementById('result-emoji').textContent = praise.emoji;
    document.getElementById('result-title').textContent = praise.title;
    document.getElementById('result-message').textContent = praise.message;
    document.getElementById('result-percent').textContent = result.percent;
    document.getElementById('result-correct').textContent = `${result.correctCount}/${result.totalQuestions} câu đúng`;
    document.getElementById('result-diamonds').textContent = `💎 +${result.diamondsEarned} kim cương`;
    document.getElementById('again-link').href = `/pages/student/practice/?subject=${subjectId}`;
    document.getElementById('again-link').textContent = `Luyện ${result.topic.name} lần nữa`;

    const wrong = result.questions.filter((question) => question.isCorrect === false);
    document.getElementById('review-list').innerHTML = wrong.length
      ? wrong.map((question, index) => `
        <div class="review-item is-wrong">
          <strong>Câu ${index + 1}: ${escapeHtml(question.prompt)}</strong>
          <p>Đáp án đúng: <b>${escapeHtml(answerText(question))}</b></p>
          <p class="muted">${escapeHtml(question.explanation ?? '')}</p>
        </div>
      `).join('')
      : '<div class="empty"><span class="empty-icon">🌟</span>Con làm đúng hết, không có câu sai!</div>';
    show(resultView);
  } catch (error) {
    window.alert(error.message);
  }
}

nextButton.addEventListener('click', () => {
  if (current + 1 >= session.questions.length) {
    finishPractice();
  } else {
    current += 1;
    renderQuestion();
  }
});

checkButton.addEventListener('click', checkAnswer);

document.getElementById('quit-button').addEventListener('click', async () => {
  const leave = await confirmAction('Con muốn chọn chủ đề khác? Lượt này sẽ chưa được tính kim cương.', {
    title: 'Rời lượt luyện tập',
    confirmText: 'Rời đi',
  });
  if (!leave) return;
  session = null;
  current = 0;
  show(setupView);
  loadTopics();
});

subjectTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-subject]');
  if (!button) return;
  subjectId = button.dataset.subject;
  const url = new URL(window.location.href);
  url.searchParams.set('subject', subjectId);
  window.history.replaceState(null, '', url);
  loadTopics();
});

topicList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-topic]');
  if (button) startPractice(button.dataset.topic, button);
});

async function main() {
  profile = await initPage('student', 'practice');
  subjectId = subjectFromUrl();
  await loadTopics();
  show(setupView);
}

main().catch((error) => {
  topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
});
