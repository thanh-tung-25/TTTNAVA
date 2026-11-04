import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
if (process.env.PGSCHEMA && process.env.PGSCHEMA !== 'ttnava_stage') throw Error('Staging schema required');
process.env.PGSCHEMA = 'ttnava_stage';
process.env.DB_DRIVER = 'postgres';
const { query, closePool, withTransaction } = await import('../src/config/db.js');
const { createOrder, reviewOrder, requireCourse } = await import('../src/services/course-service.js');
const { insertLedger } = await import('../src/services/ledger-service.js');
const rollback = new Error('EXPECTED_TEST_ROLLBACK');
let orderId;
try {
  await assert.rejects(withTransaction(async connection => {
    const run = async (sql, values = []) => (await connection.query(sql, values))[0];
    const [admin] = await run("SELECT id FROM profiles WHERE role='admin' LIMIT 1");
    const [candidate] = await run(`SELECT p.id student_id,c.id course_id FROM profiles p CROSS JOIN courses c
      WHERE p.role='student' AND c.active=1
      AND NOT EXISTS(SELECT 1 FROM course_enrollments e WHERE e.student_id=p.id AND e.course_id=c.id)
      AND NOT EXISTS(SELECT 1 FROM course_orders o WHERE o.student_id=p.id AND o.course_id=c.id AND o.status='pending') LIMIT 1`);
    assert.ok(admin && candidate, 'Staging test needs an admin and a locked course');
    await run("UPDATE courses SET price_vnd=250000,payment_instructions='MIGRATION TEST ONLY',duration_days=NULL WHERE id=?", [candidate.course_id]);
    const transaction = callback => callback(connection);
    const body = { course_id: candidate.course_id, payer_name: 'Migration test', payment_reference: 'MIGRATION-ROLLBACK-ONLY' };
    const order = await createOrder(candidate.student_id, body, transaction);
    orderId = order.id;
    await assert.rejects(requireCourse(candidate.student_id, candidate.course_id, run), error => error.code === 'COURSE_LOCKED');
    await assert.rejects(createOrder(candidate.student_id, body, transaction), error => error.code === 'ORDER_PENDING');
    const approved = await reviewOrder(admin.id, order.id, { decision: 'approved', note: 'Migration rollback test' }, transaction);
    assert.equal(approved.status, 'approved');
    await requireCourse(candidate.student_id, candidate.course_id, run);
    await assert.rejects(reviewOrder(admin.id, order.id, { decision: 'approved', note: 'Duplicate check' }, transaction), error => error.code === 'ORDER_REVIEWED');
    const [enrollment] = await run('SELECT expires_at FROM course_enrollments WHERE student_id=? AND course_id=?', [candidate.student_id, candidate.course_id]);
    assert.equal(enrollment.expires_at, null);
    const reward = { profileId: candidate.student_id, amount: 1, reason: 'practice_complete', refType: 'practice', refId: order.id };
    assert.equal(await insertLedger(connection, reward), 1);
    assert.equal(await insertLedger(connection, reward), 0);
    throw rollback;
  }), error => error === rollback);
  assert.ok(orderId);
  assert.equal((await query('SELECT id FROM course_orders WHERE id=?', [orderId])).length, 0);
  assert.equal((await query('SELECT id FROM diamond_ledger WHERE ref_id=?', [orderId])).length, 0);
  console.log(JSON.stringify({ ok: true, approvedAndUnlocked: true, duplicateBlocked: true, lifetimePreserved: true, duplicateRewardBlocked: true, rolledBack: true, committedRowsChanged: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code || 'ORDER_CHECK_FAILED', errorType: error.name }));
  process.exitCode = 1;
} finally {
  await closePool();
}
