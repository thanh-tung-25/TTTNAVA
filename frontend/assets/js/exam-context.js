export const SUBJECTS = [
  ['toan', 'Toán', '🔢'],
  ['tieng-viet', 'Tiếng Việt', '📖'],
  ['tieng-anh', 'Tiếng Anh', '🌍'],
];

export const elements = {
  setupView: document.getElementById('setup-view'),
  examView: document.getElementById('exam-view'),
  resultView: document.getElementById('result-view'),
  topicList: document.getElementById('topic-list'),
  subjectTabs: document.getElementById('subject-tabs'),
  answerArea: document.getElementById('answer-area'),
  palette: document.getElementById('question-palette'),
  timerEl: document.getElementById('exam-timer'),
};

export const store = {
  profile: null,
  subjectId: 'toan',
  attempt: null,
  current: 0,
  selection: null,
  deadline: 0,
  graceDeadline: 0,
  ticker: null,
  saveTimer: null,
  saveQueue: Promise.resolve(),
  submitting: false,
};

export function subjectFromUrl() {
  const value = new URLSearchParams(window.location.search).get('subject');
  return SUBJECTS.some(([id]) => id === value) ? value : 'toan';
}

export function show(view) {
  for (const section of [elements.setupView, elements.examView, elements.resultView]) {
    section.classList.add('hidden');
  }
  view.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function requestAutoSubmit() {
  document.dispatchEvent(new CustomEvent('exam:auto-submit'));
}

export function requestPaletteRender() {
  document.dispatchEvent(new CustomEvent('exam:palette'));
}
