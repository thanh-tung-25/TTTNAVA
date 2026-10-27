import { api, escapeHtml, formatDuration } from '/assets/js/api.js';
import {
  answerText,
  confirmAction,
  initPage,
  praiseFor,
  showError,
  syncDiamondTotal,
  toast,
  TYPE_LABELS,
} from '/assets/js/ui.js';

const SUBJECTS = [
  ['toan', 'Toán', '🔢'],
  ['tieng-viet', 'Tiếng Việt', '📖'],
  ['tieng-anh', 'Tiếng Anh', '🌍'],
];

const setupView = document.getElementById('setup-view');
const examView = document.getElementById('exam-view');
const resultView = document.getElementById('result-view');
const topicList = document.getElementById('topic-list');
const subjectTabs = document.getElementById('subject-tabs');
const answerArea = document.getElementById('answer-area');
const palette = document.getElementById('question-palette');
const timerEl = document.getElementById('exam-timer');

let profile = null;
let subjectId = 'toan';
let attempt = null;
let current = 0;
let selection = null;
let deadline = 0;
let graceDeadline = 0;
let ticker = null;
let saveTimer = null;
let saveQueue = Promise.resolve();
let submitting = false;

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
    topicList.innerHTML = payload.data.length
      ? payload.data.map((topic, index) => `
        <div class="topic-item">
          <span class="topic-index">${index + 1}</span>
          <div><h3>${escapeHtml(topic.name)}</h3><p>${topic.questionCount} câu · Bài thi 20 câu / 15 phút</p></div>
          <button class="btn btn-sm" type="button" data-topic="${escapeHtml(topic.id)}">Thi thử</button>
        </div>`).join('')
      : '<div class="empty">Chưa có chủ đề cho môn này.</div>';
  } catch (error) {
    topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
  }
}

function show(view) {
  for (const section of [setupView, examView, resultView]) section.classList.add('hidden');
  view.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function startExam(topicId, button) {
  button.disabled = true;
  button.textContent = 'Đang mở đề…';
  const confirmed = await confirmAction('Bài thi sẽ bắt đầu tính giờ ngay. Con sẵn sàng chưa?', {
    title: 'Bắt đầu thi',
    confirmText: 'Bắt đầu',
  });
  if (!confirmed) {
    button.disabled = false;
    button.textContent = 'Thi thử';
    return;
  }
  try {
    const payload = await api('/api/v1/exams', { method: 'POST', body: { topicId } });
    attempt = payload.data;
    current = 0;
    const now = Date.now();
    deadline = now + attempt.remainingSeconds * 1000;
    graceDeadline = deadline + 5000;
    show(examView);
    renderQuestion();
    startTicker();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Thi thử';
    window.alert(error.message);
  }
}

function selectedKeysOf(question) {
  if (question.type === 'multiple_choice') return question.selected?.keys ?? [];
  if (question.type === 'single_choice') return question.selected?.key ? [question.selected.key] : [];
  return [];
}

function renderQuestion() {
  const question = attempt.questions[current];
  const answeredKeys = selectedKeysOf(question);
  selection = question.type === 'multiple_choice'
    ? [...answeredKeys]
    : question.type === 'single_choice'
      ? (answeredKeys[0] ?? null)
      : question.type === 'true_false'
        ? (question.selected?.value ?? null)
        : (question.selected?.value ?? '');

  document.getElementById('exam-topic').textContent = attempt.topic.name;
  document.getElementById('exam-progress').textContent = `Câu ${current + 1}/${attempt.questions.length}`;
  document.getElementById('exam-bar').style.width = `${((current + 1) / attempt.questions.length) * 100}%`;
  document.getElementById('question-type').textContent = TYPE_LABELS[question.type] ?? '';
  document.getElementById('question-prompt').textContent = question.prompt;
  document.getElementById('prev-button').disabled = current === 0;
  document.getElementById('next-button').disabled = current + 1 >= attempt.questions.length;
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
      button.addEventListener('click', () => {
        if (question.type === 'single_choice') selection = option.key;
        else selection = selection.includes(option.key)
          ? selection.filter((key) => key !== option.key)
          : [...selection, option.key];
        list.querySelectorAll('.option').forEach((node) => {
          node.className = optionClass(question, node.dataset.key);
        });
        queueSave();
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
      button.className = selection === value ? 'option is-selected' : 'option';
      button.dataset.value = String(value);
      button.innerHTML = `<span>${label}</span>`;
      button.addEventListener('click', () => {
        selection = value;
        row.querySelectorAll('.option').forEach((node) => { node.className = 'option'; });
        button.className = 'option is-selected';
        queueSave();
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
    input.addEventListener('input', () => {
      selection = input.value;
      queueSave();
    });
    input.addEventListener('blur', () => flushSave());
    row.append(input);
    answerArea.append(row);
  }

  renderPalette();
  updateAnsweredBadge();
}

function optionClass(question, key) {
  const selected = Array.isArray(selection) ? selection.includes(key) : selection === key;
  return selected ? 'option is-selected' : 'option';
}

function renderPalette() {
  palette.innerHTML = attempt.questions.map((question, index) => {
    const answered = question.type === 'multiple_choice'
      ? (question.selected?.keys?.length ?? 0) > 0
      : question.type === 'true_false'
        ? typeof question.selected?.value === 'boolean'
        : Boolean(question.selected?.value ?? question.selected?.key);
    const attrs = `class="tab${index === current ? ' is-current' : ''}" type="button" data-index="${index}"` +
      `${index === current ? ' aria-current="true" style="background:var(--primary);color:#fff;border-color:var(--primary)"' : ''}` +
      `${answered ? ' title="Đã làm"' : ''}`;
    return `<button ${attrs}>${index + 1}${answered ? ' ✓' : ''}</button>`;
  }).join('');
}

function answeredCount() {
  return attempt.questions.filter((question) => {
    if (question.type === 'multiple_choice') return (question.selected?.keys?.length ?? 0) > 0;
    if (question.type === 'true_false') return typeof question.selected?.value === 'boolean';
    if (question.type === 'fill_in') return Boolean(question.selected?.value);
    return Boolean(question.selected?.key);
  }).length;
}

function updateAnsweredBadge() {
  document.getElementById('exam-answered').textContent = `Đã làm ${answeredCount()}/${attempt.questions.length}`;
}

function buildAnswer() {
  const question = attempt.questions[current];
  if (question.type === 'single_choice') return selection ? { key: selection } : null;
  if (question.type === 'multiple_choice') return selection.length ? { keys: selection } : null;
  if (question.type === 'true_false') return typeof selection === 'boolean' ? { value: selection } : null;
  return String(selection ?? '').trim() ? { value: String(selection).trim() } : null;
}

function snapshotAnswer() {
  if (!attempt || attempt.status !== 'in_progress' || Date.now() > graceDeadline) return null;
  const question = attempt.questions[current];
  const answer = buildAnswer();
  return question && answer ? { question, answer } : null;
}

async function persistAnswer({ question, answer }) {
  try {
    const payload = await api(`/api/v1/exams/${attempt.id}/answers`, {
      method: 'POST',
      body: { questionId: question.id, answer },
    });
    question.selected = answer;
    const badge = document.getElementById('exam-answered');
    if (badge && attempt) badge.textContent = `Đã làm ${payload.data.answeredCount}/${attempt.questions.length}`;
    if (attempt?.questions[current] === question) renderPalette();
  } catch (error) {
    if (error.code === 'EXAM_TIME_UP' || error.code === 'EXAM_SUBMITTED') {
      submitExam(true);
    } else {
      toast(error.message, 'error');
    }
  }
}

function enqueueSave(snapshot) {
  saveQueue = saveQueue.then(() => persistAnswer(snapshot));
  return saveQueue;
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const snapshot = snapshotAnswer();
    if (snapshot) enqueueSave(snapshot);
  }, 400);
}

function flushSave() {
  clearTimeout(saveTimer);
  const snapshot = snapshotAnswer();
  return snapshot ? enqueueSave(snapshot) : saveQueue;
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => {
    const now = Date.now();
    const left = Math.max(0, Math.ceil((deadline - now) / 1000));
    timerEl.textContent = formatDuration(left);
    timerEl.classList.toggle('is-urgent', left <= 60);
    if (now >= graceDeadline) {
      clearInterval(ticker);
      submitExam(true);
    } else if (now >= deadline) {
      timerEl.textContent = 'Hết giờ!';
    }
  }, 500);
}

async function submitExam(auto = false) {
  if (submitting || !attempt) return;
  if (!auto) {
    const unanswered = attempt.questions.length - answeredCount();
    const message = unanswered > 0
      ? `Con còn ${unanswered} câu chưa làm. Vẫn nộp bài chứ?`
      : 'Con nộp bài ngay bây giờ chứ?';
    const confirmed = await confirmAction(message, { title: 'Nộp bài', confirmText: 'Nộp bài' });
    if (!confirmed) return;
  }

  submitting = true;
  clearInterval(ticker);
  await flushSave();
  try {
    const payload = await api(`/api/v1/exams/${attempt.id}/submit`, { method: 'POST' });
    attempt = payload.data;
    renderResult();
  } catch (error) {
    showError(null, error);
    submitting = false;
  }
}

function renderResult() {
  const praise = praiseFor(attempt.percent);
  document.getElementById('result-emoji').textContent = praise.emoji;
  document.getElementById('result-title').textContent = praise.title;
  document.getElementById('result-message').textContent = praise.message;
  document.getElementById('result-percent').textContent = attempt.percent;
  document.getElementById('result-correct').textContent = `${attempt.correctCount}/${attempt.totalQuestions} câu đúng`;
  document.getElementById('result-diamonds').textContent = `💎 +${attempt.diamondsEarned} kim cương`;
  syncDiamondTotal();

  document.getElementById('review-list').innerHTML = attempt.questions.map((question, index) => {
    const selected = selectedAnswerText(question);
    return `
      <div class="review-item ${question.isCorrect ? 'is-correct' : 'is-wrong'}">
        <strong>Câu ${index + 1}: ${escapeHtml(question.prompt)}</strong>
        <p>Con chọn: <b>${escapeHtml(selected || 'Chưa trả lời')}</b></p>
        <p>Đáp án đúng: <b>${escapeHtml(answerText(question))}</b></p>
        <p class="muted">${escapeHtml(question.explanation ?? '')}</p>
      </div>`;
  }).join('');
  show(resultView);
}

function selectedAnswerText(question) {
  if (question.type === 'single_choice') {
    const option = question.options.find((item) => item.key === question.selected?.key);
    return option ? `${option.label}. ${option.text}` : '';
  }
  if (question.type === 'multiple_choice') {
    return (question.selected?.keys ?? []).map((key) => {
      const option = question.options.find((item) => item.key === key);
      return option ? `${option.label}. ${option.text}` : key;
    }).join('; ');
  }
  if (question.type === 'true_false') {
    return typeof question.selected?.value === 'boolean' ? (question.selected.value ? 'Đúng' : 'Sai') : '';
  }
  return question.selected?.value ?? '';
}

document.getElementById('prev-button').addEventListener('click', async () => {
  await flushSave();
  if (current > 0) { current -= 1; renderQuestion(); }
});
document.getElementById('next-button').addEventListener('click', async () => {
  await flushSave();
  if (current + 1 < attempt.questions.length) { current += 1; renderQuestion(); }
});
document.getElementById('submit-button').addEventListener('click', () => submitExam(false));
document.getElementById('exam-progress').addEventListener('click', () => {});

palette.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  await flushSave();
  current = Number(button.dataset.index);
  renderQuestion();
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
  if (button) startExam(button.dataset.topic, button);
});

window.addEventListener('beforeunload', (event) => {
  if (attempt?.status === 'in_progress' && !attempt.submitted) {
    event.preventDefault();
    event.returnValue = '';
  }
});

async function main() {
  profile = await initPage('student', 'exam');
  const value = new URLSearchParams(window.location.search).get('subject');
  subjectId = SUBJECTS.some(([id]) => id === value) ? value : 'toan';
  await loadTopics();
  show(setupView);
}

main().catch((error) => {
  topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
});
