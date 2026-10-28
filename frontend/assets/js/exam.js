import { escapeHtml } from '/assets/js/api.js';
import { initPage } from '/assets/js/ui.js';
import { startExam, submitExam } from './exam-actions.js';
import { elements, show, store, subjectFromUrl } from './exam-context.js';
import { loadTopics, renderPalette, renderQuestion } from './exam-render.js';
import { flushSave } from './exam-save.js';

document.getElementById('prev-button').addEventListener('click', async () => {
  await flushSave();
  if (store.current > 0) { store.current -= 1; renderQuestion(); }
});

document.getElementById('next-button').addEventListener('click', async () => {
  await flushSave();
  if (store.current + 1 < store.attempt.questions.length) { store.current += 1; renderQuestion(); }
});

document.getElementById('submit-button').addEventListener('click', () => submitExam(false));
document.addEventListener('exam:auto-submit', () => submitExam(true));
document.addEventListener('exam:palette', renderPalette);

elements.palette.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  await flushSave();
  store.current = Number(button.dataset.index);
  renderQuestion();
});

elements.subjectTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-subject]');
  if (!button) return;
  store.subjectId = button.dataset.subject;
  const url = new URL(window.location.href);
  url.searchParams.set('subject', store.subjectId);
  window.history.replaceState(null, '', url);
  loadTopics();
});

elements.topicList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-topic]');
  if (button) startExam(button.dataset.topic, button);
});

window.addEventListener('beforeunload', (event) => {
  if (store.attempt?.status === 'in_progress' && !store.attempt.submitted) {
    event.preventDefault();
    event.returnValue = '';
  }
});

async function main() {
  store.profile = await initPage('student', 'exam');
  store.subjectId = subjectFromUrl();
  await loadTopics();
  show(elements.setupView);
}

main().catch((error) => {
  elements.topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
});
