import { api } from '/assets/js/api.js';
import { toast } from '/assets/js/ui.js';
import {
  requestLobby,
  requestRender,
  show,
  store,
} from './challenge-context.js';

export async function openMatch(id) {
  try {
    const payload = await api(`/api/v1/challenges/${id}`);
    store.match = payload.data;
    store.feedback = null;
    store.selection = null;
    show('match');
    requestRender();
  } catch (error) {
    toast(error.message, 'error');
    show('lobby');
    requestLobby();
  }
}

function buildAnswer(question) {
  const selection = store.selection;
  if (question.type === 'single_choice') return selection ? { key: selection } : null;
  if (question.type === 'multiple_choice') return selection.length ? { keys: selection } : null;
  if (question.type === 'true_false') return typeof selection === 'boolean' ? { value: selection } : null;
  return String(selection ?? '').trim() ? { value: String(selection).trim() } : null;
}

export async function submitAnswer() {
  if (store.busy || !store.match?.myQuestion) return;
  const question = store.match.myQuestion;
  const answer = buildAnswer(question);
  if (!answer) {
    toast(question.type === 'multiple_choice' ? 'Con chọn ít nhất một đáp án nhé!' : 'Con chọn hoặc nhập đáp án nhé!', 'error');
    return;
  }
  store.busy = true;
  const button = document.getElementById('submit-answer');
  if (button) { button.disabled = true; button.textContent = 'Đang gửi…'; }
  try {
    const payload = await api(`/api/v1/challenges/${store.match.id}/answers`, {
      method: 'POST',
      body: { index: store.match.myIndex, questionId: question.id, answer },
    });
    store.feedback = { ...payload.data.feedback, question };
    store.match = payload.data.state;
    requestRender();
  } catch (error) {
    toast(error.message, 'error');
    if (button) { button.disabled = false; button.textContent = 'Trả lời'; }
    if (error.code === 'CHALLENGE_TIME_UP') refreshMatch();
  } finally {
    store.busy = false;
  }
}

export async function refreshMatch() {
  if (!store.match) return;
  try {
    const payload = await api(`/api/v1/challenges/${store.match.id}`);
    store.match = payload.data;
    requestRender();
  } catch (error) {
    if (error.status === 404) {
      store.match = null;
      show('lobby');
      requestLobby();
    }
  }
}
