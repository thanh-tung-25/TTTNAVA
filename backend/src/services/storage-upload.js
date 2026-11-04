import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import env from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { storageClient, downloadObject, sha256, DOCX_MIME, MAX_WORD_BYTES } from './private-storage.js';

const uploadSchema = z.object({ filename: z.string().min(1).max(255).regex(/\.docx$/i), bytes: z.number().int().min(1).max(MAX_WORD_BYTES), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
export async function issueWordUpload(user, body) {
  const input = uploadSchema.parse(body);
  const objectKey = 'uploads/' + user.id + '/' + randomUUID() + '.docx';
  const { data, error } = await storageClient().from(env.storage.bucket).createSignedUploadUrl(objectKey, { upsert: false });
  if (error || !data) throw new AppError(502, 'UPLOAD_UNAVAILABLE', 'Chưa thể tạo lượt tải tệp.');
  const fileToken = jwt.sign({ kind: 'word_upload', owner: user.id, objectKey, ...input }, env.jwt.secret, { expiresIn: '30m', audience: 'ttnava-word-import', algorithm: 'HS256' });
  return { signedUrl: data.signedUrl, fileToken, expiresAt: Date.now() + 25 * 60000 };
}
export function verifyUploadToken(token, owner) {
  let value;
  try { value = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'], audience: 'ttnava-word-import' }); }
  catch { throw new AppError(400, 'UPLOAD_EXPIRED', 'Lượt tải tệp hết hạn. Vui lòng chọn tệp lại.'); }
  if (value.kind !== 'word_upload' || value.owner !== owner || !value.objectKey?.startsWith('uploads/' + owner + '/')) throw new AppError(403, 'UPLOAD_FORBIDDEN', 'Tệp không thuộc tài khoản này.');
  uploadSchema.parse(value);
  return value;
}
export async function uploadedWord(token, user) {
  if (user?.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Chỉ quản trị viên được nhập tài liệu.');
  const upload = verifyUploadToken(token, user.id);
  const buffer = await downloadObject(upload.objectKey, upload.bytes);
  if (sha256(buffer) !== upload.sha256 || buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) throw new AppError(400, 'UPLOAD_CHANGED', 'Tệp tải lên không khớp hoặc không phải Word .docx.');
  return { buffer, originalname: upload.filename, mimetype: DOCX_MIME, size: buffer.length };
}
