import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
process.env.DB_DRIVER = 'postgres';
process.env.PGPOOL_SIZE = '1';
process.env.PG_READ_ONLY = 'true';
const { query, closePool, withTransaction } = await import('../src/config/db.js');
const { listCourses, requireCourse } = await import('../src/services/course-service.js');
const { signToken } = await import('../src/utils/jwt.js');
const { resolveUser } = await import('../src/middlewares/auth.js');
const { listSubjects, listTopics } = await import('../src/services/catalog-service.js');
const { getAdminStats } = await import('../src/services/stats-service.js');
const { createApp } = await import('../src/app.js');
const { default: request } = await import('supertest');

try {
  // This script uses only one session and protects even accidental writes.
  const subjects = await listSubjects();
  for (const subject of subjects) await listTopics(subject.id, 1);
  const stats = await getAdminStats();
  if (stats.bank.questions !== 40230) throw Error('Question inventory mismatch');
  const students = await query("SELECT * FROM profiles WHERE role='student'");
  let enrollments = 0, locked = 0, sessions = 0;
  let httpChecks = 0;
  const app = createApp();
  if ((await request(app).get('/api/v1/courses')).status !== 401) throw Error('Anonymous access not blocked');
  httpChecks++;
  for (const student of students) {
    if (!student.banned_until || new Date(student.banned_until) <= new Date()) {
      const token = signToken(student);
      const resolved = await resolveUser({ cookies: {}, get: () => 'Bearer ' + token });
      if (resolved.id !== student.id) throw Error('Session identity mismatch');
      sessions++;
      for (const route of ['/api/v1/auth/me', '/api/v1/courses', '/pages/student/courses/']) {
        if ((await request(app).get(route).set('Authorization', 'Bearer ' + token)).status !== 200) throw Error('Student HTTP check failed');
        httpChecks++;
      }
      if ((await request(app).get('/api/v1/courses/admin/orders').set('Authorization', 'Bearer ' + token)).status !== 403) throw Error('Admin boundary failed');
      httpChecks++;
    }
    const courses = await listCourses(student.id);
    for (const course of courses) {
      try {
        await requireCourse(student.id, course.id);
        if (Number(course.unlocked) !== 1) throw Error('Enrollment mismatch');
        enrollments++;
      } catch (error) {
        if (error.code !== 'COURSE_LOCKED' || Number(course.unlocked) !== 0) throw error;
        locked++;
      }
    }
  }
  const [admin] = await query("SELECT * FROM profiles WHERE role='admin' AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) LIMIT 1");
  if (admin) {
    for (const route of ['/api/v1/courses/admin/catalog', '/api/v1/courses/admin/orders', '/api/v1/courses/admin/enrollments', '/api/v1/courses/admin/payment-qr', '/api/v1/chinese/catalog', '/api/v1/chinese/stats', '/api/v1/worksheets/admin', '/api/v1/worksheets/admin/reviews', '/api/v1/admin/content/', '/pages/admin/courses/']) {
      if ((await request(app).get(route).set('Authorization', 'Bearer ' + signToken(admin))).status !== 200) throw Error('Admin HTTP check failed');
      httpChecks++;
    }
  }
  await withTransaction(async connection => {
    const [rows] = await connection.query('SELECT current_schema() AS schema');
    if (rows[0].schema !== (process.env.PGSCHEMA || 'ttnava_stage')) throw Error('Schema mismatch');
  });
  console.log(JSON.stringify({ ok: true, students: students.length, sessions, enrollments, locked, httpChecks, dataChanged: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code || 'CORE_CHECK_FAILED' }));
  process.exitCode = 1;
} finally {
  await closePool();
}
