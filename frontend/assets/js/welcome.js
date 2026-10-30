const answers = document.querySelectorAll('[data-answer]');
const feedback = document.getElementById('quiz-feedback');
answers.forEach((button) => {
  button.addEventListener('click', () => {
    answers.forEach((answer) => {
      answer.classList.remove('correct', 'retry');
      answer.setAttribute('aria-pressed', 'false');
    });
    const correct = button.dataset.answer === '5';
    button.classList.add(correct ? 'correct' : 'retry');
    button.setAttribute('aria-pressed', 'true');
    feedback.textContent = correct
      ? 'Chính xác! 3 + 2 = 5 quả táo. Con làm tốt lắm!'
      : 'Gần đúng rồi! Con thử đếm từng quả táo một lần nữa nhé.';
  });
});
