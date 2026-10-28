import env from '../config/env.js';
import { AppError } from '../utils/errors.js';

const MAX_DOCUMENT_CHARS = 30000;

export function aiQuestionConfig() {
  const configured = env.ai.enabled && Boolean(env.ai.url && env.ai.model);
  return {
    enabled: env.ai.enabled,
    configured,
    model: configured ? env.ai.model : null,
    message: configured
      ? 'AI đã được cấu hình cho trang quản trị.'
      : 'AI chưa được cấu hình. Đặt AI_QUESTION_ENABLED=true, AI_QUESTION_API_URL và AI_QUESTION_MODEL trong backend/.env.',
  };
}

const SYSTEM_PROMPT = `Bạn là trợ lý soạn câu hỏi tiểu học bằng tiếng Việt.
Chỉ tạo câu hỏi dựa trên nội dung tài liệu được cung cấp, không thêm kiến thức ngoài tài liệu.
Trả về JSON đúng dạng:
{"questions":[{"prompt":"...","type":"single_choice|multiple_choice|true_false|fill_in",
"options":[{"key":"a","text":"..."}],"answer":{"key":"a"},"explanation":"...","difficulty":"easy|medium|hard"}]}
Với multiple_choice dùng answer.keys; true_false dùng answer.value (true/false); fill_in dùng answer.accepted (mảng chuỗi).
Mỗi câu có 2-4 phương án với single_choice, 3-5 với multiple_choice. Không tạo câu nếu tài liệu không đủ dữ kiện.`;

function parseProviderContent(raw) {
  const text = String(raw ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError(502, 'AI_INVALID_RESPONSE', 'AI trả về dữ liệu không phải JSON hợp lệ');
  }
  const rows = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(rows)) {
    throw new AppError(502, 'AI_INVALID_RESPONSE', 'AI không trả về danh sách câu hỏi');
  }
  return rows.slice(0, 50);
}

function normalizeAnswer(type, answer) {
  if (!answer || typeof answer !== 'object') return {};
  if (type === 'single_choice') return { key: String(answer.key ?? '').toLowerCase() };
  if (type === 'multiple_choice') {
    return { keys: [...new Set((answer.keys ?? []).map((key) => String(key).toLowerCase()))] };
  }
  if (type === 'true_false') return { value: answer.value };
  return {
    accepted: Array.isArray(answer.accepted)
      ? answer.accepted.map((value) => String(value).trim()).filter(Boolean)
      : [],
  };
}

function normalizeGenerated(row) {
  const type = ['single_choice', 'multiple_choice', 'true_false', 'fill_in'].includes(row.type)
    ? row.type
    : 'single_choice';
  const options = Array.isArray(row.options)
    ? row.options
      .filter((option) => option && option.key && option.text)
      .map((option) => ({ key: String(option.key).toLowerCase(), text: String(option.text).trim() }))
    : [];
  const question = {
    prompt: String(row.prompt ?? '').trim(),
    type,
    options,
    answer: normalizeAnswer(type, row.answer),
    explanation: String(row.explanation ?? '').trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(row.difficulty) ? row.difficulty : 'medium',
    status: 'draft',
    issues: [],
  };
  if (!question.prompt) question.issues.push('Thiếu nội dung câu hỏi.');
  if (!question.explanation) question.issues.push('Thiếu lời giải.');
  if (type === 'single_choice' && !options.some((option) => option.key === question.answer.key)) {
    question.issues.push('Đáp án không khớp phương án.');
  }
  if (type === 'multiple_choice' && (question.answer.keys ?? []).length < 2) {
    question.issues.push('Cần ít nhất 2 đáp án đúng.');
  }
  if (type === 'true_false' && typeof question.answer.value !== 'boolean') {
    question.issues.push('Đáp án Đúng/Sai không hợp lệ.');
  }
  if (type === 'fill_in' && (question.answer.accepted ?? []).length === 0) {
    question.issues.push('Thiếu đáp án điền.');
  }
  return question;
}

export async function generateQuestionsWithAi(text, context = {}) {
  const config = aiQuestionConfig();
  if (!config.configured) {
    throw new AppError(503, 'AI_NOT_CONFIGURED', config.message);
  }
  const document = String(text ?? '').trim();
  if (!document) throw new AppError(422, 'EMPTY_DOCUMENT', 'Tài liệu không có nội dung để gửi AI');
  if (document.length > MAX_DOCUMENT_CHARS) {
    throw new AppError(413, 'DOCUMENT_TOO_LONG', `Tài liệu tối đa ${MAX_DOCUMENT_CHARS.toLocaleString('vi-VN')} ký tự khi dùng AI`);
  }

  let response;
  try {
    response = await fetch(env.ai.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.ai.key ? { authorization: `Bearer ${env.ai.key}` } : {}),
      },
      body: JSON.stringify({
        model: env.ai.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Môn: ${context.subjectName ?? 'chưa chọn'}\nLớp: ${context.grade ?? 'chưa chọn'}\nChủ đề: ${context.topicName ?? 'chưa chọn'}\n\nTÀI LIỆU:\n${document}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new AppError(502, 'AI_PROVIDER_ERROR', `Không gọi được dịch vụ AI: ${error.message}`);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new AppError(502, 'AI_PROVIDER_ERROR', `Dịch vụ AI trả lỗi ${response.status}`, { detail });
  }
  const body = await response.json().catch(() => null);
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new AppError(502, 'AI_INVALID_RESPONSE', 'AI không trả về nội dung câu hỏi');
  const questions = parseProviderContent(content).map(normalizeGenerated);
  return {
    source: 'ai',
    questions,
    metadata: context,
    issues: questions.length ? [] : ['AI không tạo được câu hỏi từ tài liệu này.'],
  };
}
