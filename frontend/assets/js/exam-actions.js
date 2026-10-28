import { api, formatDuration } from '/assets/js/api.js';
import { confirmAction, showError } from '/assets/js/ui.js';
import { elements, show, store } from './exam-context.js';
import { answeredCount, renderQuestion } from './exam-render.js';
import { renderResult } from './exam-result.js';
import { flushSave } from './exam-save.js';

export async function startExam(topicId, button) {
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
    store.attempt = payload.data;
    store.current = 0;
    const now = Date.now();
    store.deadline = now + store.attempt.remainingSeconds * 1000;
    store.graceDeadline = store.deadline + 5000;
    show(elements.examView);
    renderQuestion();
    startTicker();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Thi thử';
    window.alert(error.message);
  }
}

export function startTicker() {
  clearInterval(store.ticker);
  store.ticker = setInterval(() => {
    const now = Date.now();
    const left = Math.max(0, Math.ceil((store.deadline - now) / 1000));
    elements.timerEl.textContent = formatDuration(left);
    elements.timerEl.classList.toggle('is-urgent', left <= 60);
    if (now >= store.graceDeadline) {
      clearInterval(store.ticker);
      submitExam(true);
    } else if (now >= store.deadline) {
      elements.timerEl.textContent = 'Hết giờ!';
    }
  }, 500);
}

export async function submitExam(auto = false) {
  if (store.submitting || !store.attempt) return;
  if (!auto) {
    const unanswered = store.attempt.questions.length - answeredCount();
    const message = unanswered > 0
      ? `Con còn ${unanswered} câu chưa làm. Vẫn nộp bài chứ?`
      : 'Con nộp bài ngay bây giờ chứ?';
    const confirmed = await confirmAction(message, { title: 'Nộp bài', confirmText: 'Nộp bài' });
    if (!confirmed) return;
  }

  store.submitting = true;
  clearInterval(store.ticker);
  await flushSave();
  try {
    const payload = await api(`/api/v1/exams/${store.attempt.id}/submit`, { method: 'POST' });
    store.attempt = payload.data;
    renderResult();
  } catch (error) {
    showError(null, error);
    store.submitting = false;
  }
}
