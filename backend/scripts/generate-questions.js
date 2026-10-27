import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../src/config/env.js';
import { buildTopicQuestions } from './content/build-question.js';
import { loadProviders } from './content/registry.js';
import { TOPICS, questionCountForTopic, typeQuota } from './content/topic-catalog.js';

const outputDir = path.join(env.backendRoot, 'seed-data', 'questions');

function parseOnly(argv) {
  const argument = argv.find((value) => value.startsWith('--only='));
  if (!argument) return null;
  return new Set(argument.slice('--only='.length).split(',').map((value) => value.trim()).filter(Boolean));
}

async function main() {
  const only = parseOnly(process.argv.slice(2));
  const providers = await loadProviders({ allowMissing: Boolean(only) });
  const targets = only ? TOPICS.filter((topic) => only.has(topic.id) || only.has(topic.subjectId) || only.has(`${topic.subjectId}-${topic.grade}`)) : TOPICS;

  if (targets.length === 0) throw new Error('Không có chủ đề nào khớp --only');
  if (!only) {
    const missing = TOPICS.filter((topic) => !providers.has(topic.id)).map((topic) => topic.id);
    if (missing.length > 0) {
      throw new Error(`Thiếu provider cho ${missing.length} chủ đề: ${missing.slice(0, 8).join(', ')}...`);
    }
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  let total = 0;
  const summary = [];

  for (const topic of targets) {
    const provider = providers.get(topic.id);
    if (!provider) throw new Error(`Thiếu provider cho ${topic.id}`);
    for (const method of ['single', 'multi', 'tf', 'fill']) {
      if (typeof provider[method] !== 'function') {
        throw new Error(`Provider ${topic.id} thiếu hàm ${method}`);
      }
    }
    const expected = questionCountForTopic(topic);
    const quota = typeQuota(expected);
    const questions = buildTopicQuestions(topic, provider, quota);
    if (questions.length !== expected) {
      throw new Error(`${topic.id}: cần ${expected} câu, nhận ${questions.length}`);
    }
    for (const [type, count] of Object.entries(quota)) {
      const actual = questions.filter((question) => question.type === type).length;
      if (actual !== count) throw new Error(`${topic.id}: loại ${type} cần ${count}, nhận ${actual}`);
    }

    const payload = { topic, questions };
    await fs.writeFile(
      path.join(outputDir, `${topic.id}.json`),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8',
    );
    total += questions.length;
    summary.push({ id: topic.id, questions: questions.length });
    process.stdout.write(`  ${topic.id}: ${questions.length} câu\n`);
  }

  await fs.writeFile(
    path.join(outputDir, '_manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), topics: summary.length, questions: total }, null, 2)}\n`,
    'utf8',
  );
  console.log(`Đã tạo ${summary.length} chủ đề, ${total} câu hỏi tại ${outputDir}`);
}

main().catch((error) => {
  console.error('Tạo câu hỏi thất bại:', error.message);
  process.exitCode = 1;
});
