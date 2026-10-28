import { describe, expect, test } from 'vitest';
import { parseQuestionDocument } from '../src/services/question-import-parser.js';

const SAMPLE = `MÔN: Tiếng Việt
LỚP: 2
CHỦ ĐỀ: Chính tả

Câu 1. Từ nào viết đúng?
A. con mèo
B. con mèo mun
C. con mèo tam thể
Đáp án: A
Lời giải: “con mèo” viết đúng chính tả.
Độ khó: Dễ

Câu 2. Chọn các từ chỉ sự vật.
A. bàn
B. chạy
C. ghế
Đáp án: A, C
Lời giải: bàn và ghế là từ chỉ sự vật.
Độ khó: Vừa

Câu 3. Trời hôm nay rất đẹp.
Đáp án: Đúng
Lời giải: Đây là câu kể.
Độ khó: Dễ

Câu 4. Điền từ còn thiếu: Em ... bài tập.
Đáp án: làm | hoàn thành
Lời giải: Có thể dùng “làm” hoặc “hoàn thành”.
Độ khó: Vừa`;

describe('Bộ đọc câu hỏi từ tài liệu Word', () => {
  test('test_question_import_parser_reads_sample_types', () => {
    const result = parseQuestionDocument(SAMPLE);
    expect(result.questions).toHaveLength(4);
    expect(result.questions.map((row) => row.type)).toEqual([
      'single_choice',
      'multiple_choice',
      'true_false',
      'fill_in',
    ]);
    expect(result.questions[0].answer).toEqual({ key: 'a' });
    expect(result.questions[1].answer).toEqual({ keys: ['a', 'c'] });
    expect(result.questions[2].answer).toEqual({ value: true });
    expect(result.questions[3].answer).toEqual({ accepted: ['làm', 'hoàn thành'] });
    expect(result.metadata).toMatchObject({ subjectId: 'tieng-viet', grade: 2 });
    expect(result.questions.every((row) => row.issues.length === 0)).toBe(true);
  });

  test('test_question_import_parser_flags_missing_answer_and_explanation', () => {
    const result = parseQuestionDocument('Câu 1. 1 + 1 = ?\nA. 1\nB. 2');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].issues).toContain('Thiếu lời giải.');
    expect(result.questions[0].issues).toContain('Đáp án không khớp phương án A–D.');
  });

  test('test_question_import_parser_flags_knowledge_only_document', () => {
    const result = parseQuestionDocument('Bài học: Phép cộng là gì?\nPhép cộng là thêm vào.');
    expect(result.questions).toHaveLength(0);
    expect(result.issues[0]).toContain('Không tìm thấy câu hỏi');
  });
});
