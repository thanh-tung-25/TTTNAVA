export const SUBJECTS = [
  ['toan', 'Toán', '🔢'],
  ['tieng-viet', 'Tiếng Việt', '📖'],
  ['tieng-anh', 'Tiếng Anh', '🌍'],
];

export const elements = {
  setupView: document.getElementById('setup-view'),
  quizView: document.getElementById('quiz-view'),
  resultView: document.getElementById('result-view'),
  topicList: document.getElementById('topic-list'),
  subjectTabs: document.getElementById('subject-tabs'),
  answerArea: document.getElementById('answer-area'),
  feedback: document.getElementById('feedback'),
  checkButton: document.getElementById('check-button'),
  nextButton: document.getElementById('next-button'),
};

export const store = {
  profile: null,
  subjectId: 'toan',
  session: null,
  current: 0,
  selection: null,
  busy: false,
};

export function subjectFromUrl() {
  const value = new URLSearchParams(window.location.search).get('subject');
  return SUBJECTS.some(([id]) => id === value) ? value : 'toan';
}

export function show(view) {
  for (const section of [elements.setupView, elements.quizView, elements.resultView]) {
    section.classList.add('hidden');
  }
  view.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function requestCheck() {
  document.dispatchEvent(new CustomEvent('practice:check'));
}
