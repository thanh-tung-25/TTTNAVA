import {
  clean,
  normalizeLabel,
  parseMetadata,
  questionIssues,
  resolveQuestion,
} from './question-import-format.js';

const QUESTION_START = /^(?:câu|cau)\s*(\d+)\s*[.:)\-]\s*(.*)$/i;
const NUMBER_START = /^(\d{1,3})\s*[.)]\s+(.{3,})$/;
const OPTION_LINE = /^([a-eA-E])\s*[.:)]\s+(.+)$/;
const FIELD_LINE = /^(đáp án(?:\s+đúng)?|dap an|answer|lời giải|loi giai|giải thích|giai thich|explanation|độ khó|do kho|difficulty|loại|loai|type)\s*[:：]\s*(.*)$/i;

function questionStarts(line) {
  return QUESTION_START.test(line) || NUMBER_START.test(line);
}

function startQuestion(line) {
  const match = clean(line).match(QUESTION_START) ?? clean(line).match(NUMBER_START);
  return {
    number: Number(match?.[1]),
    prompt: clean(match?.[2] ?? ''),
    options: [],
    answer: '', explanation: '', difficulty: '', typeText: '', lastField: 'prompt',
  };
}

function appendField(current, field, value) {
  if (!value) return;
  current[field] = clean([current[field], value].filter(Boolean).join(' '));
}

function parseBlock(raw) {
  const lines = String(raw).replace(/\r\n?/g, '\n').split('\n');
  const item = startQuestion(lines[0]);
  for (const rawLine of lines.slice(1)) {
    const line = clean(rawLine);
    if (!line) continue;
    const option = line.match(OPTION_LINE);
    const field = line.match(FIELD_LINE);
    if (field) {
      const key = normalizeLabel(field[1]);
      if (key.includes('giải') || key.includes('giai') || key.includes('explanation')) {
        item.explanation = clean(field[2]);
        item.lastField = 'explanation';
      } else if (key.includes('độ') || key.includes('do ') || key.includes('difficulty')) {
        item.difficulty = clean(field[2]);
        item.lastField = '';
      } else if (key.includes('loại') || key.includes('loai') || key.includes('type')) {
        item.typeText = clean(field[2]);
        item.lastField = '';
      } else {
        item.answer = clean(field[2]);
        item.lastField = 'answer';
      }
    } else if (option && !questionStarts(line)) {
      item.options.push({
        key: option[1].toLocaleLowerCase(),
        text: clean(option[2]),
      });
      item.lastField = 'option';
    } else if (item.lastField === 'option') {
      appendField(item.options[item.options.length - 1], 'text', line);
    } else if (item.lastField === 'answer') {
      appendField(item, 'answer', line);
    } else if (item.lastField === 'explanation') {
      appendField(item, 'explanation', line);
    } else {
      appendField(item, 'prompt', line);
    }
  }
  return item;
}

export function parseQuestionDocument(text) {
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  const lines = normalized.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const cleaned = clean(line);
    if (!cleaned) {
      if (current) current.push('');
      continue;
    }
    if (questionStarts(cleaned)) {
      current = [line];
      blocks.push(current);
    } else if (current) {
      current.push(line);
    }
  }

  const firstQuestionIndex = lines.findIndex((line) => questionStarts(clean(line)));
  const metadata = parseMetadata(firstQuestionIndex >= 0 ? lines.slice(0, firstQuestionIndex) : lines);
  const questions = blocks.slice(0, 200).map((block) => {
    const raw = parseBlock(block.filter(Boolean).join('\n'));
    const question = resolveQuestion(raw);
    return {
      sourceNumber: raw.number,
      ...question,
      issues: questionIssues(question),
    };
  });

  const issues = [];
  if (!questions.length) {
    issues.push('Không tìm thấy câu hỏi theo mẫu. Hãy kiểm tra file mẫu hoặc dùng chức năng AI nếu tài liệu chỉ có kiến thức.');
  }
  if (blocks.length > 200) issues.push('Chỉ đọc 200 câu đầu tiên trong một lần nhập.');
  return { questions, metadata, issues };
}
