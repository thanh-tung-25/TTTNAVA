import { randomUUID } from 'node:crypto';
import { withTransaction } from '../config/db.js';
import { validateQuestionPayload } from './admin-question-validation.js';
import { resolveQuestionScope } from './curriculum-scope.js';
import { getQuestionDetail } from './admin-questions.js';
import { archiveFile, DOCX_MIME } from './private-storage.js';

async function insertQuestion(connection, adminId, topicId, payload, forcedStatus = null) {
  const clean = validateQuestionPayload(payload.type, payload);
  const status = forcedStatus ?? clean.status ?? 'draft';
  const publishedAt = status === 'published' ? new Date() : null;
  const questionId = randomUUID();

  await connection.query(
    `INSERT INTO questions
       (id, topic_id, type, prompt, image_url, difficulty, status, created_by, updated_by, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      questionId,
      topicId,
      payload.type,
      clean.prompt,
      clean.imageUrl,
      clean.difficulty,
      status,
      adminId,
      adminId,
      publishedAt,
    ],
  );

  for (const option of clean.options) {
    await connection.query(
      'INSERT INTO question_options (question_id, opt_key, option_text, sort_order) VALUES (?, ?, ?, ?)',
      [questionId, option.key, option.text, option.sortOrder],
    );
  }
  await connection.query(
    'INSERT INTO question_answers (question_id, answer_json, explanation) VALUES (?, ?, ?)',
    [questionId, JSON.stringify(clean.answer), clean.explanation],
  );

  const after = {
    prompt: clean.prompt,
    difficulty: clean.difficulty,
    status,
    imageUrl: clean.imageUrl,
    options: clean.options,
    answer: clean.answer,
    explanation: clean.explanation,
  };
  await connection.query(
    `INSERT INTO atomic_question_writes (question_id, admin_id, action, before_json, after_json)
     VALUES (?, ?, 'create', NULL, ?)`,
    [questionId, adminId, JSON.stringify(after)],
  );
  return questionId;
}

export async function createQuestion(adminId, payload) {
  const scope = await resolveQuestionScope(payload);
  const questionId = await withTransaction((connection) => (
    insertQuestion(connection, adminId, scope.topicId, payload)
  ));
  return getQuestionDetail(questionId);
}

export async function importQuestionDrafts(adminId, payload, sourceFile=null) {
  const scope = await resolveQuestionScope(payload);
  const documentId=sourceFile?randomUUID():null;
  if (sourceFile) await archiveFile('word_import_documents/' + documentId, sourceFile.buffer, DOCX_MIME, sourceFile.originalname);
  const ids = await withTransaction(async (connection) => {
    if(sourceFile)await connection.query('INSERT INTO word_import_documents (id,filename,original,byte_size,lesson_id,question_count,imported_by) VALUES (?,?,?,?,?,?,?)',[documentId,sourceFile.originalname.slice(0,255),sourceFile.buffer,sourceFile.buffer.length,scope.lessonId,payload.questions.length,adminId]);
    const created = [];
    for (const question of payload.questions) {
      const id=await insertQuestion(connection, adminId, scope.topicId, question, 'draft');
      if(documentId)await connection.query('UPDATE questions SET import_document_id=? WHERE id=?',[documentId,id]);
      created.push(id);
    }
    return created;
  });
  return {
    created: ids.length,
    status: 'draft',
    ids,
    documentId,
  };
}
