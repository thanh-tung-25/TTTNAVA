import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
process.env.DB_DRIVER = 'postgres';
const apply = process.argv.includes('--apply');
process.env.STORAGE_PROVIDER = apply ? 'supabase' : 'database';
if (process.env.PGSCHEMA && process.env.PGSCHEMA !== 'ttnava_stage') throw Error('Staging schema required');
process.env.PGSCHEMA = 'ttnava_stage';
const { query, closePool } = await import('../src/config/db.js');
const { storageClient, archiveFile, DOCX_MIME, MAX_WORD_BYTES } = await import('../src/services/private-storage.js');
const { default: env } = await import('../src/config/env.js');
const sources = [
  { table: 'word_import_documents', id: 'id', bytes: 'original', filename: 'filename', mime: DOCX_MIME },
  { table: 'chinese_documents', id: 'id', bytes: 'original', filename: 'filename', mime: DOCX_MIME },
  { table: 'course_payment_qr', id: 'course_key', bytes: 'image', filename: null, mime: null },
  { table: 'worksheet_images', id: 'id', bytes: 'image', filename: null, mime: null },
];
try {
  const inventory = [];
  for (const source of sources) {
    const [counts] = await query(`SELECT COUNT(*) files,COALESCE(SUM(OCTET_LENGTH(${source.bytes})),0) bytes FROM ${source.table} WHERE OCTET_LENGTH(${source.bytes})>0`);
    inventory.push({ table: source.table, ...counts });
  }
  if (!apply) {
    console.log(JSON.stringify({ ok: true, mode: 'inventory-only', storageKeyPresent: Boolean(env.storage.key), inventory, dataChanged: false }));
  } else {
    const storage = storageClient();
    const existing = await storage.getBucket(env.storage.bucket);
    if (existing.error) {
      const created = await storage.createBucket(env.storage.bucket, { public: false, fileSizeLimit: MAX_WORD_BYTES, allowedMimeTypes: [DOCX_MIME, 'image/png', 'image/jpeg', 'image/webp'] });
      if (created.error) throw Error('Private bucket creation failed');
    }
    const { data: bucket, error } = await storage.getBucket(env.storage.bucket);
    if (error || !bucket || bucket.public !== false) throw Error('Expected a private bucket');
    let files = 0, bytes = 0;
    for (const source of sources) {
      let last = '';
      while (true) {
        const rows = await query(`SELECT ${source.id} id,${source.bytes} content${source.filename ? ',' + source.filename + ' filename' : ',mime_type'} FROM ${source.table} WHERE ${source.id}>? AND OCTET_LENGTH(${source.bytes})>0 ORDER BY ${source.id} LIMIT 10`, [last]);
        if (!rows.length) break;
        const metadata = [];
        // Object uploads are independent. Batch only the metadata writes so
        // each file does not need a separate database transaction round trip.
        for (let offset = 0; offset < rows.length; offset += 4) {
          await Promise.all(rows.slice(offset, offset + 4).map(row => archiveFile(
            source.table + '/' + row.id, row.content, source.mime || row.mime_type,
            row.filename || source.table, async (_sql, params) => { metadata.push(params); },
          )));
        }
        const values = metadata.flat();
        await query('INSERT INTO file_assets(asset_key,object_key,sha256,byte_size,mime_type,filename) VALUES '
          + metadata.map(() => '(?,?,?,?,?,?)').join(',')
          + ' ON CONFLICT(asset_key) DO UPDATE SET object_key=EXCLUDED.object_key,sha256=EXCLUDED.sha256,byte_size=EXCLUDED.byte_size,mime_type=EXCLUDED.mime_type,filename=EXCLUDED.filename', values);
        files += rows.length;
        bytes += rows.reduce((total, row) => total + row.content.length, 0);
        console.log(JSON.stringify({ verifiedFiles: files }));
        last = rows.at(-1).id;
      }
    }
    const report = { ok: true, files, bytes, bucket: env.storage.bucket, public: false, sha256Verified: true, originalBytesPreserved: true, at: new Date().toISOString() };
    const reports = path.join(root, 'backups/storage-migration');
    await fs.mkdir(reports, { recursive: true });
    await fs.writeFile(path.join(reports, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code || 'STORAGE_MIGRATION_FAILED', originalBytesPreserved: true }));
  process.exitCode = 1;
} finally { await closePool(); }
