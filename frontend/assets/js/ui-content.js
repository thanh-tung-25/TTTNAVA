import { escapeHtml } from './api.js';

export function praiseFor(percent) {
  if (percent >= 100) return { emoji: '🎉', title: 'Con giỏi quá!', message: 'Đúng hết rồi! Con thật tuyệt vời!' };
  if (percent >= 70) return { emoji: '🌟', title: 'Con làm rất tốt!', message: 'Cố gắng thêm chút nữa để đạt điểm tuyệt đối nhé!' };
  if (percent >= 40) return { emoji: '💪', title: 'Con đã cố gắng rồi!', message: 'Luyện tập thêm sẽ giỏi hơn nữa!' };
  return { emoji: '🌱', title: 'Đừng lo nhé!', message: 'Mỗi lần luyện tập là một bước tiến!' };
}

export const TYPE_LABELS = {
  single_choice: 'Chọn một đáp án',
  multiple_choice: 'Chọn nhiều đáp án',
  true_false: 'Đúng hay sai?',
  fill_in: 'Điền vào chỗ trống',
};

export function answerText(question) {
  const answer = question.correctAnswer ?? question.answer ?? {};
  if (question.type === 'single_choice') {
    const option = (question.options ?? []).find((item) => item.key === answer.key);
    return option ? `${option.label ?? option.key.toUpperCase()}. ${option.text}` : answer.key ?? '—';
  }
  if (question.type === 'multiple_choice') {
    return (answer.keys ?? []).map((key) => {
      const option = (question.options ?? []).find((item) => item.key === key);
      return option ? `${option.label ?? option.key.toUpperCase()}. ${option.text}` : key;
    }).join('; ') || '—';
  }
  if (question.type === 'true_false') return answer.value ? 'Đúng' : 'Sai';
  return (answer.accepted ?? []).join(' / ') || '—';
}

export function emptyState(icon, title, message = '') {
  return `<div class="empty"><span class="empty-icon" aria-hidden="true">${icon}</span><strong>${escapeHtml(title)}</strong>${message ? `<p style="margin:.3rem 0 0">${escapeHtml(message)}</p>` : ''}</div>`;
}
