import { z } from 'zod';
import { badRequest } from '../utils/errors.js';
export const status = z.enum(['draft', 'published', 'archived']);
const text = z.string().trim().max(20000);
const url = z.string().max(1000).refine(v => !v || /^\/(?!\/)[^\\]*$/.test(v) || /^https:\/\/[^\s]+$/.test(v), 'Nguồn phải là đường dẫn nội bộ hoặc HTTPS');
export const lessonSchema = z.object({ level_id: z.coerce.number().int().min(1).max(9), title: text.min(1).max(255), position: z.coerce.number().int().min(1).max(100000), description: text.default(''), image_url: url.default(''), status });
export const itemSchema = z.object({ id: z.string().uuid().optional(), kind: z.enum(['vocabulary','grammar','dialogue','reading','question','unknown']), data: z.object({
 hanzi: text.optional(), pinyin: text.optional(), meaning: text.optional(), part_of_speech: text.optional(), example: text.optional(), example_pinyin: text.optional(), example_meaning: text.optional(), audio_url: url.optional(), image_url: url.optional(), mnemonic: text.optional(), radicals: text.optional(), group: z.enum(['main','extended']).optional(),
 text: text.optional(), title: text.optional(), prompt: text.optional(), type: z.enum(['choice','text','pinyin','matching','ordering','listening','dictation','fill']).optional(), options: z.array(text.min(1)).max(30).optional(), targets: z.array(text.min(1)).max(30).optional(), accepted: z.array(text.min(1)).max(30).optional(), explanation: text.optional(), difficulty: z.enum(['easy','medium','hard']).optional(), approved: z.boolean().optional(), vocabulary_id: z.union([z.string().uuid(), z.literal('')]).optional(),
 }) });
export const setSchema = z.object({ title: text.min(1).max(255), status, items: z.array(itemSchema).max(1000) });
export const testSchema = z.object({ title: text.min(1).max(255), set_ids: z.array(z.string().uuid()).min(1).max(100), duration_seconds: z.coerce.number().int().min(30).max(86400).nullable(), pass_percent: z.coerce.number().int().min(1).max(100), status });
export function parse(schema, value) { const r = schema.safeParse(value); if (!r.success) throw badRequest('Dữ liệu chưa hợp lệ', r.error.flatten()); return r.data; }
export function normalizeAnswer(value) { return String(value ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('zh'); }
export function issues(items) {
 const errors = [], seen = new Set();
 items.forEach((item, index) => {
  const d = item.data, add = message => errors.push({ index: index + 1, message });
  if (item.kind === 'vocabulary' && (!d.hanzi || !d.meaning)) add('Thiếu chữ Hán hoặc nghĩa');
  if (item.kind === 'question') {
   if (!d.prompt || !d.type) add('Thiếu nội dung hoặc loại câu hỏi');
   if (!d.accepted?.length) add('Thiếu đáp án đúng');
   if (['choice','listening'].includes(d.type) && (!d.options || d.options.length < 2 || d.accepted?.some(a => !d.options.includes(a)))) add('Đáp án phải thuộc các lựa chọn (ít nhất 2 lựa chọn)');
   if (d.options && new Set(d.options.map(normalizeAnswer)).size !== d.options.length) add('Lựa chọn trùng');
   if (d.type==='matching' && (!d.options?.length || d.options.length!==d.targets?.length || new Set(d.targets.map(normalizeAnswer)).size!==d.targets.length)) add('Ghép cặp cần hai danh sách có cùng số phần tử, không trùng');
   if (d.type==='ordering' && (!d.options?.length || d.accepted?.some(a=>normalizeAnswer(a).split(' ').sort().join(' ')!==normalizeAnswer(d.options.join(' ')).split(' ').sort().join(' ')))) add('Đáp án sắp xếp phải dùng đúng các từ đã cho');
   if (['listening','dictation'].includes(d.type) && !d.audio_url) add('Thiếu âm thanh');
   if (!d.approved) add('Câu hỏi chưa được duyệt');
  }
  if (['grammar','dialogue','reading'].includes(item.kind) && !d.text) add('Thiếu nội dung');
  if (item.kind === 'unknown') add('Nội dung chưa xác định: cần phân loại hoặc chủ động xóa');
  const key = `${item.kind}:${normalizeAnswer(d.hanzi || d.prompt || d.text)}`;
  if (seen.has(key)) add('Nội dung trùng trong bộ'); seen.add(key);
 });
 if (!items.length) errors.push({ index: 0, message: 'Bộ chưa có nội dung' });
 return errors;
}
