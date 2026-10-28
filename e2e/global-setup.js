import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { query, closePool } from '../backend/src/config/db.js';
import { hashPassword } from '../backend/src/services/auth-service.js';
import { signToken } from '../backend/src/utils/jwt.js';
import {
  deleteFixtureQuestions,
  insertFixtureQuestions,
} from '../backend/tests/fixtures/questions.js';

const AUTH_DIR = path.resolve('e2e', '.auth');

async function writeStorageState(name, profile) {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  const state = {
    cookies: [
      {
        name: 'tttnava_token',
        value: signToken(profile),
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  };
  await fs.writeFile(path.join(AUTH_DIR, `${name}.json`), JSON.stringify(state, null, 2));
}

export const E2E_USERS = [
  { username: 'e2e_admin', password: 'E2eAdmin@123', role: 'admin', displayName: 'Cô E2E', avatarKey: 'cu', grade: null },
  { username: 'e2e_lan', password: 'E2eLan@123', role: 'student', displayName: 'Bé E2E Lan', avatarKey: 'meo', grade: 3 },
  { username: 'e2e_minh', password: 'E2eMinh@123', role: 'student', displayName: 'Bé E2E Minh', avatarKey: 'ho', grade: 3 },
];

export async function idsFor(usernames) {
  const placeholders = usernames.map(() => '?').join(',');
  const rows = await query(`SELECT id FROM profiles WHERE username IN (${placeholders})`, usernames);
  return rows.map((row) => row.id);
}

export async function cleanupUsers(ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  const challengeIds = (
    await query(
      `SELECT id FROM challenges WHERE challenger_id IN (${placeholders}) OR opponent_id IN (${placeholders})`,
      [...ids, ...ids],
    )
  ).map((row) => row.id);
  if (challengeIds.length) {
    const challengePlaceholders = challengeIds.map(() => '?').join(',');
    await query(`DELETE FROM challenge_answers WHERE challenge_id IN (${challengePlaceholders})`, challengeIds);
    await query(`DELETE FROM challenge_rewards WHERE challenge_id IN (${challengePlaceholders})`, challengeIds);
    await query(
      `DELETE FROM diamond_ledger WHERE ref_type = 'challenge' AND ref_id IN (${challengePlaceholders})`,
      challengeIds,
    );
    await query(`DELETE FROM challenges WHERE id IN (${challengePlaceholders})`, challengeIds);
  }
  const practiceIds = (
    await query(`SELECT id FROM practice_sessions WHERE student_id IN (${placeholders})`, ids)
  ).map((row) => row.id);
  if (practiceIds.length) {
    const sessionPlaceholders = practiceIds.map(() => '?').join(',');
    await query(`DELETE FROM practice_answers WHERE session_id IN (${sessionPlaceholders})`, practiceIds);
    await query(`DELETE FROM practice_questions WHERE session_id IN (${sessionPlaceholders})`, practiceIds);
    await query(`DELETE FROM practice_sessions WHERE id IN (${sessionPlaceholders})`, practiceIds);
  }
  const examIds = (
    await query(`SELECT id FROM exam_attempts WHERE student_id IN (${placeholders})`, ids)
  ).map((row) => row.id);
  if (examIds.length) {
    const examPlaceholders = examIds.map(() => '?').join(',');
    await query(`DELETE FROM exam_answers WHERE attempt_id IN (${examPlaceholders})`, examIds);
    await query(`DELETE FROM exam_questions WHERE attempt_id IN (${examPlaceholders})`, examIds);
    await query(`DELETE FROM exam_attempts WHERE id IN (${examPlaceholders})`, examIds);
  }
  await query(`DELETE FROM diamond_ledger WHERE profile_id IN (${placeholders})`, ids);
  await query(`DELETE FROM atomic_question_writes WHERE admin_id IN (${placeholders})`, ids);
  await query(
    `DELETE FROM questions WHERE created_by IN (${placeholders}) OR updated_by IN (${placeholders})`,
    [...ids, ...ids],
  );
  await query(`DELETE FROM profiles WHERE id IN (${placeholders})`, ids);
}

export async function cleanupGeneratedUsers() {
  const rows = await query("SELECT id FROM profiles WHERE username LIKE 'e2e\\_ui\\_%'");
  await cleanupUsers(rows.map((row) => row.id));
}

export default async function globalSetup() {
  const existing = await idsFor(E2E_USERS.map((user) => user.username));
  await cleanupUsers(existing);
  await cleanupGeneratedUsers();
  for (const user of E2E_USERS) {
    const hash = await hashPassword(user.password);
    await query(
      `INSERT INTO profiles (id, username, email, password_hash, role, display_name, avatar_key, grade, banned_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        randomUUID(),
        user.username,
        `${user.username}@kids-learning.invalid`,
        hash,
        user.role,
        user.displayName,
        user.avatarKey,
        user.grade,
      ],
    );
  }
  const profileRows = await query(
    `SELECT id, username, role FROM profiles
     WHERE username IN ('e2e_admin', 'e2e_lan', 'e2e_minh')`,
  );
  for (const profile of profileRows) {
    const name = profile.username.replace('e2e_', '');
    await writeStorageState(name, profile);
  }
  const lan = profileRows.find((row) => row.username === 'e2e_lan');
  await query(
    `INSERT INTO diamond_ledger (profile_id, amount, reason, ref_type, ref_id)
     VALUES (?, 3, 'exam_perfect', 'exam', ?)`,
    [lan.id, randomUUID()],
  );
  const execute = (sql, params = []) => query(sql, params);
  await deleteFixtureQuestions(execute);
  await insertFixtureQuestions(execute);
  await closeGlobalPool();
}

export async function closeGlobalPool() {
  await closePool();
}
