import { randomUUID } from 'node:crypto';
import { query, withTransaction, dialectSql } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';

export const activeEnrollment = `e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP(3) AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP(3))`;
export async function requireCourse(student, courseId, run=query) {
 const rows=await run(`SELECT c.* FROM courses c JOIN course_enrollments e ON e.course_id=c.id WHERE e.student_id=? AND c.id=? AND c.active=1 AND ${activeEnrollment}`,[student,courseId]);
 if(!rows[0])throw new AppError(403,'COURSE_LOCKED','Khóa học chưa được mở hoặc đã hết hạn. Con chọn khóa học để đăng ký.',{courseId});
 return rows[0];
}
export async function listCourses(student) {
 return query(`SELECT c.*,e.source,e.starts_at,e.expires_at,e.revoked_at,
 EXISTS(SELECT 1 FROM course_payment_qr qr WHERE qr.course_key IN(c.id,'default')) has_payment_qr,
 (SELECT qr.crop_json FROM course_payment_qr qr WHERE qr.course_key IN(c.id,'default') ORDER BY (qr.course_key=c.id) DESC LIMIT 1) payment_qr_crop,
 CASE WHEN e.student_id IS NOT NULL AND ${activeEnrollment} AND c.active=1 THEN 1 ELSE 0 END unlocked,
 (SELECT o.status FROM course_orders o WHERE o.student_id=? AND o.course_id=c.id ORDER BY o.created_at DESC,o.id DESC LIMIT 1) order_status
 FROM courses c LEFT JOIN course_enrollments e ON e.course_id=c.id AND e.student_id=? ORDER BY c.kind DESC,c.level`,[student,student]);
}
export async function createOrder(student,body,transaction=withTransaction) {
 const d=z.object({course_id:z.string().max(32),payer_name:z.string().trim().min(2).max(120),payment_reference:z.string().trim().min(3).max(150),note:z.string().trim().max(1000).default('')}).parse(body);
 return transaction(async connection=>{
  const run=async(sql,p=[]) => (await connection.query(sql,p))[0];
  await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[student]);
  const [course]=await run('SELECT * FROM courses WHERE id=? AND active=1 FOR UPDATE',[d.course_id]);
  if(!course)throw new AppError(404,'COURSE_NOT_FOUND','Không tìm thấy khóa học');
  if(course.price_vnd==null||!course.payment_instructions.trim())throw new AppError(409,'COURSE_NOT_CONFIGURED','Khóa học đang chờ admin cấu hình học phí và thanh toán.');
  const [access]=await run(`SELECT e.student_id FROM course_enrollments e WHERE student_id=? AND course_id=? AND ${activeEnrollment}`,[student,course.id]);
  if(access)throw new AppError(409,'ALREADY_ENROLLED','Con đã được mở khóa học này.');
  const [pending]=await run("SELECT id FROM course_orders WHERE student_id=? AND course_id=? AND status='pending'",[student,course.id]);
  if(pending)throw new AppError(409,'ORDER_PENDING','Yêu cầu trước đang chờ xác nhận.');
  const id=randomUUID();
  await run('INSERT INTO course_orders(id,student_id,course_id,amount_vnd,duration_days,payer_name,payment_reference,note) VALUES (?,?,?,?,?,?,?,?)',[id,student,course.id,course.price_vnd,course.duration_days,d.payer_name,d.payment_reference,d.note]);
  return {id,status:'pending'};
 });
}
export const courseConfigSchema=z.object({title:z.string().trim().min(1).max(120),description:z.string().trim().max(5000),price_vnd:z.number().int().min(0).max(100000000).nullable(),duration_days:z.number().int().min(1).max(3650).nullable(),payment_instructions:z.string().trim().max(5000),active:z.boolean()});
export async function updateCourse(id,body) {
 const d=courseConfigSchema.parse(body);
 const result=await query('UPDATE courses SET title=?,description=?,price_vnd=?,duration_days=?,payment_instructions=?,active=? WHERE id=?',[d.title,d.description,d.price_vnd,d.duration_days,d.payment_instructions,d.active,id]);
 if(!result.affectedRows)throw new AppError(404,'COURSE_NOT_FOUND','Không tìm thấy khóa học');
 return {id};
}
export async function reviewOrder(admin,id,body,transaction=withTransaction) {
 const d=z.object({decision:z.enum(['approved','rejected']),note:z.string().trim().min(1).max(1000)}).parse(body);
 return transaction(async connection=>{
  const run=async(sql,p=[]) => (await connection.query(sql,p))[0];
  const [order]=await run('SELECT * FROM course_orders WHERE id=? FOR UPDATE',[id]);
  if(!order)throw new AppError(404,'ORDER_NOT_FOUND','Không tìm thấy yêu cầu');
  if(order.status!=='pending')throw new AppError(409,'ORDER_REVIEWED','Yêu cầu đã được xử lý.');
  const [course]=await run('SELECT active FROM courses WHERE id=? FOR UPDATE',[order.course_id]);
  if(d.decision==='approved'&&!course.active)throw new AppError(409,'COURSE_INACTIVE','Khóa học đã tạm ngừng.');
  if(d.decision==='approved') {
   const [existing]=await run(`SELECT e.student_id FROM course_enrollments e WHERE student_id=? AND course_id=? AND ${activeEnrollment} FOR UPDATE`,[order.student_id,order.course_id]);
   if(existing)throw new AppError(409,'ALREADY_ENROLLED','Học sinh đã có quyền học; kiểm tra lại đơn trước khi duyệt.');
   const expires=order.duration_days?new Date(Date.now()+order.duration_days*86400000):null;
   await run(dialectSql(
    `INSERT INTO course_enrollments(student_id,course_id,source,granted_by,expires_at) VALUES (?,?,'order',?,?) ON DUPLICATE KEY UPDATE source='order',granted_by=VALUES(granted_by),starts_at=CURRENT_TIMESTAMP(3),expires_at=VALUES(expires_at),revoked_at=NULL`,
    `INSERT INTO course_enrollments(student_id,course_id,source,granted_by,expires_at) VALUES (?,?,'order',?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET source='order',granted_by=EXCLUDED.granted_by,starts_at=CURRENT_TIMESTAMP(3),expires_at=EXCLUDED.expires_at,revoked_at=NULL`,
   ),[order.student_id,order.course_id,admin,expires]);
  }
  await run('UPDATE course_orders SET status=?,review_note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(3) WHERE id=?',[d.decision,d.note,admin,id]);
  await run('INSERT INTO course_access_audit(student_id,course_id,actor_id,action,note) VALUES (?,?,?,?,?)',[order.student_id,order.course_id,admin,d.decision,d.note]);
  return {id,status:d.decision};
 });
}
