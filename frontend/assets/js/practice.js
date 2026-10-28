import { escapeHtml } from '/assets/js/api.js';
import { confirmAction, initPage } from '/assets/js/ui.js';
import { checkAnswer, finishPractice, startPractice } from './practice-actions.js';
import {
  elements,
  show,
  store,
  subjectFromUrl,
} from './practice-context.js';
import { loadTopics, renderQuestion } from './practice-render.js';

elements.nextButton.addEventListener('click', () => {
  if (store.current + 1 >= store.session.questions.length) {
    finishPractice();
  } else {
    store.current += 1;
    renderQuestion();
  }
});

elements.checkButton.addEventListener('click', checkAnswer);
document.addEventListener('practice:check', checkAnswer);

document.getElementById('quit-button').addEventListener('click', async () => {
  const leave = await confirmAction('Con muốn chọn chủ đề khác? Lượt này sẽ chưa được tính kim cương.', {
    title: 'Rời lượt luyện tập',
    confirmText: 'Rời đi',
  });
  if (!leave) return;
  store.session = null;
  store.current = 0;
  show(elements.setupView);
  loadTopics();
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
  if (button) startPractice(button.dataset.topic, button);
});

async function main() {
  store.profile = await initPage('student', 'practice');
  store.subjectId = subjectFromUrl();
  await loadTopics();
  show(elements.setupView);
}

main().catch((error) => {
  elements.topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
});
