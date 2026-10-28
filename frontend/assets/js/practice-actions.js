import { api, escapeHtml } from '/assets/js/api.js';
import {
  answerText,
  praiseFor,
  syncDiamondTotal,
} from '/assets/js/ui.js';
import {
  elements,
  show,
  store,
} from './practice-context.js';
import { renderQuestion } from './practice-render.js';

export async function startPractice(topicId, button) {
  button.disabled = true;
  button.textContent = 'Đang mở…';
  try {
    const payload = await api('/api/v1/practice', { method: 'POST', body: { topicId } });
    store.session = payload.data;
    store.current = store.session.currentIndex ?? 0;
    show(elements.quizView);
    renderQuestion();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Học ngay';
    window.alert(error.message);
  }
}

export async function checkAnswer() {
  if (store.busy) return;
  const question = store.session.questions[store.current];
  let answer;
  if (question.type === 'single_choice') {
    if (!store.selection) return window.alert('Con hãy chọn một đáp án nhé!');
    answer = { key: store.selection };
  } else if (question.type === 'multiple_choice') {
    if (!store.selection.length) return window.alert('Con hãy chọn ít nhất một đáp án nhé!');
    answer = { keys: store.selection };
  } else if (question.type === 'true_false') {
    if (store.selection === null) return window.alert('Con hãy chọn Đúng hoặc Sai nhé!');
    answer = { value: store.selection };
  } else {
    if (!String(store.selection ?? '').trim()) return window.alert('Con hãy nhập câu trả lời nhé!');
    answer = { value: String(store.selection).trim() };
  }

  store.busy = true;
  elements.checkButton.disabled = true;
  elements.checkButton.textContent = 'Đang chấm…';
  try {
    const payload = await api(`/api/v1/practice/${store.session.id}/answers`, {
      method: 'POST',
      body: { questionId: question.id, answer },
    });
    store.session = payload.data.state;
    renderQuestion();
  } catch (error) {
    window.alert(error.message);
    elements.checkButton.disabled = false;
    elements.checkButton.textContent = 'Kiểm tra';
  } finally {
    store.busy = false;
  }
}

export async function finishPractice() {
  try {
    const payload = await api(`/api/v1/practice/${store.session.id}/finish`, { method: 'POST' });
    const result = payload.data;
    syncDiamondTotal();
    const praise = praiseFor(result.percent);
    document.getElementById('result-emoji').textContent = praise.emoji;
    document.getElementById('result-title').textContent = praise.title;
    document.getElementById('result-message').textContent = praise.message;
    document.getElementById('result-percent').textContent = result.percent;
    document.getElementById('result-correct').textContent = `${result.correctCount}/${result.totalQuestions} câu đúng`;
    document.getElementById('result-diamonds').textContent = `💎 +${result.diamondsEarned} kim cương`;
    document.getElementById('again-link').href = `/pages/student/practice/?subject=${store.subjectId}`;
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
    show(elements.resultView);
  } catch (error) {
    window.alert(error.message);
  }
}
