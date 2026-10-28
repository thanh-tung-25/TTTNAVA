import { api } from '/assets/js/api.js';
import { toast } from '/assets/js/ui.js';
import { requestAutoSubmit, requestPaletteRender, store } from './exam-context.js';

function buildAnswer() {
  const question = store.attempt.questions[store.current];
  if (question.type === 'single_choice') return store.selection ? { key: store.selection } : null;
  if (question.type === 'multiple_choice') return store.selection.length ? { keys: store.selection } : null;
  if (question.type === 'true_false') return typeof store.selection === 'boolean' ? { value: store.selection } : null;
  return String(store.selection ?? '').trim() ? { value: String(store.selection).trim() } : null;
}

function snapshotAnswer() {
  if (!store.attempt || store.attempt.status !== 'in_progress' || Date.now() > store.graceDeadline) return null;
  const question = store.attempt.questions[store.current];
  const answer = buildAnswer();
  return question && answer ? { question, answer } : null;
}

async function persistAnswer({ question, answer }) {
  try {
    const payload = await api(`/api/v1/exams/${store.attempt.id}/answers`, {
      method: 'POST',
      body: { questionId: question.id, answer },
    });
    question.selected = answer;
    const badge = document.getElementById('exam-answered');
    if (badge && store.attempt) {
      badge.textContent = `Đã làm ${payload.data.answeredCount}/${store.attempt.questions.length}`;
    }
    if (store.attempt?.questions[store.current] === question) requestPaletteRender();
  } catch (error) {
    if (error.code === 'EXAM_TIME_UP' || error.code === 'EXAM_SUBMITTED') {
      requestAutoSubmit();
    } else {
      toast(error.message, 'error');
    }
  }
}

function enqueueSave(snapshot) {
  store.saveQueue = store.saveQueue.then(() => persistAnswer(snapshot));
  return store.saveQueue;
}

export function queueSave() {
  clearTimeout(store.saveTimer);
  store.saveTimer = setTimeout(() => {
    const snapshot = snapshotAnswer();
    if (snapshot) enqueueSave(snapshot);
  }, 400);
}

export function flushSave() {
  clearTimeout(store.saveTimer);
  const snapshot = snapshotAnswer();
  return snapshot ? enqueueSave(snapshot) : store.saveQueue;
}
