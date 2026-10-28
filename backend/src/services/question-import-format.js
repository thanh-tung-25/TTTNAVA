const DIFFICULTIES = new Map([
  ['dễ', 'easy'], ['de', 'easy'], ['easy', 'easy'],
  ['vừa', 'medium'], ['trung bình', 'medium'], ['trung binh', 'medium'], ['medium', 'medium'],
  ['khó', 'hard'], ['kho', 'hard'], ['hard', 'hard'],
]);

const TYPE_NAMES = new Map([
  ['một đáp án', 'single_choice'], ['mot dap an', 'single_choice'], ['single', 'single_choice'],
  ['nhiều đáp án', 'multiple_choice'], ['nhieu dap an', 'multiple_choice'], ['multiple', 'multiple_choice'],
  ['đúng sai', 'true_false'], ['dung sai', 'true_false'], ['true/false', 'true_false'],
  ['điền', 'fill_in'], ['dien', 'fill_in'], ['fill', 'fill_in'],
]);

export function clean(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeLabel(value) {
  return clean(value).toLocaleLowerCase('vi').replace(/\s+/g, ' ');
}

export function parseMetadata(lines) {
  const metadata = {};
  for (const line of lines) {
    const match = clean(line).match(/^(môn(?: học)?|mon(?: hoc)?|subject|khối|lớp|lop|grade|chủ đề|chu de|topic)\s*[:：]\s*(.+)$/i);
    if (!match) continue;
    const key = normalizeLabel(match[1]);
    const value = clean(match[2]);
    if (key.startsWith('môn') || key.startsWith('mon') || key === 'subject') {
      metadata.subjectName = value;
      const slug = normalizeLabel(value);
      if (slug.includes('toán') || slug === 'toan') metadata.subjectId = 'toan';
      if (slug.includes('việt') || slug.includes('viet')) metadata.subjectId = 'tieng-viet';
      if (slug.includes('anh')) metadata.subjectId = 'tieng-anh';
    } else if (key.startsWith('chủ') || key.startsWith('chu') || key === 'topic') {
      metadata.topicName = value;
    } else {
      const grade = Number(value.match(/[1-5]/)?.[0]);
      if (grade) metadata.grade = grade;
    }
  }
  return metadata;
}

function splitAnswerLines(value) {
  return String(value ?? '')
    .split('|')
    .map((part) => clean(part))
    .filter(Boolean);
}

function answerToChoiceKeys(answerText, options) {
  const answer = clean(answerText);
  if (!answer) return [];
  const directText = options.find((option) => normalizeLabel(option.text) === normalizeLabel(answer));
  if (directText) return [directText.key];
  const letters = [...answer.matchAll(/(?:^|[\s,;/(])([a-e])(?=$|[\s,;/)])/gi)]
    .map((match) => match[1].toLocaleLowerCase());
  if (letters.length) return [...new Set(letters)];
  return options
    .filter((option) => normalizeLabel(answer).includes(normalizeLabel(option.text)))
    .map((option) => option.key);
}

function truthValue(value) {
  const text = normalizeLabel(value);
  if (['đúng', 'dung', 'true', 'yes', 'có', 'co', 'd'].includes(text)) return true;
  if (['sai', 'false', 'no', 'không', 'khong', 's'].includes(text)) return false;
  return null;
}

export function resolveQuestion(raw) {
  const options = raw.options;
  const answerText = clean(raw.answer);
  const explicitType = TYPE_NAMES.get(normalizeLabel(raw.typeText ?? ''));
  const truth = truthValue(answerText);
  let type = explicitType;
  if (!type) {
    if (options.length >= 2) {
      type = answerToChoiceKeys(answerText, options).length > 1 ? 'multiple_choice' : 'single_choice';
    } else {
      type = truth !== null ? 'true_false' : 'fill_in';
    }
  }

  let answer = {};
  if (type === 'single_choice' || type === 'multiple_choice') {
    const keys = answerToChoiceKeys(answerText, options);
    answer = type === 'single_choice' ? { key: keys[0] ?? '' } : { keys };
  } else if (type === 'true_false') {
    answer = { value: truth };
  } else {
    answer = { accepted: splitAnswerLines(answerText) };
  }

  return {
    prompt: clean(raw.prompt),
    type,
    options,
    answer,
    explanation: clean(raw.explanation),
    difficulty: DIFFICULTIES.get(normalizeLabel(raw.difficulty)) ?? 'medium',
    status: 'draft',
  };
}

export function questionIssues(question) {
  const issues = [];
  if (!question.prompt) issues.push('Thiếu nội dung câu hỏi.');
  if (!question.explanation) issues.push('Thiếu lời giải.');
  if (question.type === 'single_choice') {
    if (question.options.length < 2) issues.push('Cần ít nhất 2 phương án.');
    if (!question.answer.key) issues.push('Đáp án không khớp phương án A–D.');
  }
  if (question.type === 'multiple_choice') {
    if (question.options.length < 3) issues.push('Cần ít nhất 3 phương án.');
    if ((question.answer.keys ?? []).length < 2) issues.push('Cần chọn ít nhất 2 đáp án đúng.');
  }
  if (question.type === 'true_false' && typeof question.answer.value !== 'boolean') {
    issues.push('Đáp án phải là Đúng hoặc Sai.');
  }
  if (question.type === 'fill_in' && (question.answer.accepted ?? []).length === 0) {
    issues.push('Thiếu đáp án điền.');
  }
  return issues;
}
