import { escapeHtml } from '/assets/js/api.js';
import { answerText, praiseFor, syncDiamondTotal } from '/assets/js/ui.js';
import { elements, show, store } from './exam-context.js';

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

export function renderResult() {
  const attempt = store.attempt;
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
  show(elements.resultView);
}
