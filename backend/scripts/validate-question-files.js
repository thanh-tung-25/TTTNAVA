import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../src/config/env.js';
import { topicFileSchema } from './lib/question-file.js';
import { TOPICS, questionCountForTopic, typeQuota } from './content/topic-catalog.js';

const questionsDir = path.join(env.backendRoot, 'seed-data', 'questions');

async function main() {
  const requireVolume = process.argv.includes('--require-volume');
  const catalog = new Map(TOPICS.map((topic) => [topic.id, topic]));
  let files;
  try {
    files = (await fs.readdir(questionsDir)).filter((name) => name.endsWith('.json') && !name.startsWith('_')).sort();
  } catch {
    throw new Error(`Không tìm thấy thư mục ${questionsDir}. Chạy npm run generate:questions trước.`);
  }
  if (files.length === 0) throw new Error('Không có file câu hỏi nào để kiểm tra.');

  const errors = [];
  const seenIds = new Set();
  const seenTopics = new Set();
  let totalQuestions = 0;

  for (const file of files) {
    const fullPath = path.join(questionsDir, file);
    let payload;
    try {
      payload = JSON.parse(await fs.readFile(fullPath, 'utf8'));
    } catch (error) {
      errors.push(`${file}: JSON không hợp lệ (${error.message})`);
      continue;
    }

    const parsed = topicFileSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${file}: ${issue.path.join('.')} — ${issue.message}`);
      }
      continue;
    }

    const { topic, questions } = parsed.data;
    const expectedTopic = catalog.get(topic.id);
    if (!expectedTopic) {
      errors.push(`${file}: chủ đề ${topic.id} không có trong danh mục 91 chủ đề`);
      continue;
    }
    const expectedFile = `${topic.id}.json`;
    if (file !== expectedFile) errors.push(`${file}: tên file phải là ${expectedFile}`);
    if (seenTopics.has(topic.id)) errors.push(`${file}: chủ đề bị lặp`);
    seenTopics.add(topic.id);

    for (const field of ['subjectId', 'grade', 'name', 'slug', 'sortOrder']) {
      if (topic[field] !== expectedTopic[field]) {
        errors.push(`${file}: topic.${field} = ${topic[field]}, danh mục là ${expectedTopic[field]}`);
      }
    }

    const expectedCount = questionCountForTopic(expectedTopic);
    if (questions.length !== expectedCount) {
      errors.push(`${file}: cần ${expectedCount} câu, có ${questions.length}`);
    }
    const quota = typeQuota(expectedCount);
    for (const [type, expected] of Object.entries(quota)) {
      const actual = questions.filter((question) => question.type === type).length;
      if (actual !== expected) errors.push(`${file}: loại ${type} cần ${expected}, có ${actual}`);
    }

    const prompts = new Set();
    for (const question of questions) {
      if (seenIds.has(question.id)) errors.push(`${file}: mã câu ${question.id} bị lặp toàn hệ thống`);
      seenIds.add(question.id);
      if (!question.id.startsWith(`${topic.id}-`)) {
        errors.push(`${file}: mã ${question.id} không bắt đầu bằng ${topic.id}-`);
      }
      const promptKey = question.prompt.normalize('NFC').toLocaleLowerCase('vi');
      if (prompts.has(promptKey)) errors.push(`${file}: đề bị lặp — ${question.prompt}`);
      prompts.add(promptKey);
    }

    totalQuestions += questions.length;
  }

  const missing = TOPICS.filter((topic) => !seenTopics.has(topic.id));
  if (requireVolume && missing.length > 0) {
    errors.push(`Thiếu ${missing.length} chủ đề: ${missing.map((topic) => topic.id).join(', ')}`);
  }

  if (errors.length > 0) {
    console.error(`Kiểm tra thất bại: ${errors.length} lỗi trong ${files.length} file`);
    for (const error of errors.slice(0, 60)) console.error(` - ${error}`);
    if (errors.length > 60) console.error(` ... còn ${errors.length - 60} lỗi`);
    process.exitCode = 1;
    return;
  }

  console.log(`Kiểm tra thành công: ${files.length}/${TOPICS.length} chủ đề, ${totalQuestions} câu hỏi.`);
  if (requireVolume && (files.length !== TOPICS.length || totalQuestions !== 5263)) {
    console.error(`Sai tổng: cần ${TOPICS.length} chủ đề / 5263 câu, nhận ${files.length} / ${totalQuestions}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Kiểm tra thất bại:', error.message);
  process.exitCode = 1;
});
