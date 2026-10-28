import mammoth from 'mammoth';
import { AppError } from '../utils/errors.js';
import { parseQuestionDocument } from './question-import-parser.js';

const MAX_EXTRACTED_CHARS = 200000;

export async function extractDocxText(buffer) {
  if (!buffer?.length || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new AppError(422, 'INVALID_DOCX', 'Tệp tải lên không phải tài liệu .docx hợp lệ');
  }

  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    if (!text.trim()) throw new AppError(422, 'EMPTY_DOCUMENT', 'Tài liệu không có nội dung văn bản');
    if (text.length > MAX_EXTRACTED_CHARS) {
      throw new AppError(413, 'DOCUMENT_TOO_LONG', 'Tài liệu quá dài. Hãy tách thành nhiều tệp nhỏ hơn.');
    }
    return { text, messages: result.messages ?? [] };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(422, 'INVALID_DOCX', 'Không đọc được tệp .docx. Hãy kiểm tra lại tệp.');
  }
}

export async function extractDocxQuestions(buffer, fileName = 'tai-lieu.docx') {
  const { text, messages } = await extractDocxText(buffer);
  const parsed = parseQuestionDocument(text);
  return {
    source: 'docx',
    fileName,
    extractedCharacters: text.length,
    extractionWarnings: messages.slice(0, 10).map((message) => message.message),
    ...parsed,
  };
}
