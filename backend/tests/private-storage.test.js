import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../src/config/env.js';
const fake = vi.hoisted(() => ({
  upload: vi.fn(), download: vi.fn(), createSignedUploadUrl: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { from: () => fake } }) }));
import { archiveFile, readArchive, sha256, DOCX_MIME } from '../src/services/private-storage.js';
import { issueWordUpload, verifyUploadToken, uploadedWord } from '../src/services/storage-upload.js';
const original = { ...env.storage };
const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
beforeAll(() => {
  Object.assign(env.storage, { enabled: true, url: 'https://example.supabase.co', key: 'sb_secret_test', bucket: 'private-test' });
  fake.upload.mockResolvedValue({ error: null });
  fake.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
  fake.createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: 'https://example.supabase.co/storage/upload?token=temporary' }, error: null });
});
afterAll(() => Object.assign(env.storage, original));
it('archives original bytes only after verifying the uploaded content', async () => {
  const run = vi.fn().mockResolvedValue({ affectedRows: 1 });
  await archiveFile('word_import_documents/' + randomUUID(), bytes, DOCX_MIME, 'lesson.docx', run);
  expect(fake.upload.mock.calls.at(-1)[1].equals(bytes)).toBe(true);
  expect(run).toHaveBeenCalledOnce();
  expect(run.mock.calls[0][1].slice(2)).toEqual([sha256(bytes), bytes.length, DOCX_MIME, 'lesson.docx']);
  fake.download.mockResolvedValueOnce({ data: new Blob([Buffer.alloc(bytes.length)]), error: null });
  await expect(archiveFile('bad', bytes, DOCX_MIME, 'lesson.docx', run)).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
  expect(run).toHaveBeenCalledOnce();
});
it('verifies stored bytes on reads and preserves database fallback', async () => {
  expect(await readArchive('missing', bytes, async () => [])).toBe(bytes);
  const result = await readArchive('stored', null, async () => [{ object_key: 'private/object', byte_size: bytes.length, sha256: sha256(bytes) }]);
  expect(result.equals(bytes)).toBe(true);
});
it('upload tickets bind owner, expiry, filename, length and content hash', async () => {
  const user = { id: randomUUID(), role: 'admin' };
  const ticket = await issueWordUpload(user, { filename: 'lesson.docx', bytes: bytes.length, sha256: sha256(bytes) });
  expect(verifyUploadToken(ticket.fileToken, user.id).filename).toBe('lesson.docx');
  expect(() => verifyUploadToken(ticket.fileToken, randomUUID())).toThrow();
  expect(() => verifyUploadToken(ticket.fileToken + 'tampered', user.id)).toThrow();
  expect((await uploadedWord(ticket.fileToken, user)).buffer.equals(bytes)).toBe(true);
  await expect(uploadedWord(ticket.fileToken, { ...user, role: 'student' })).rejects.toMatchObject({ status: 403 });
  fake.download.mockResolvedValueOnce({ data: new Blob([Buffer.alloc(bytes.length)]), error: null });
  await expect(uploadedWord(ticket.fileToken, user)).rejects.toMatchObject({ code: 'UPLOAD_CHANGED' });
  const expired = jwt.sign({ kind: 'word_upload', owner: user.id }, env.jwt.secret, { expiresIn: -1, audience: 'ttnava-word-import' });
  expect(() => verifyUploadToken(expired, user.id)).toThrow();
});
