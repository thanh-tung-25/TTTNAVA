import { query, withTransaction, dialectSql } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {activeFreePeriod,freeCourseFields} from './course-free-periods.js';
import {checkoutMomo} from './course-momo.js';

export function courseReviewCondition(user){
 const scope=adminScopeOf(user);
 if(scope==='super')return '1=1';
 if(scope==='chinese')return "c.kind='chinese'";
 throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bạn không có quyền xét duyệt đăng ký học phần này.');
}

export const activeEnrollment = `e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP(3) AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP(3))`;
export async function requireCourse(student, courseId, run=query) {
 const rows=await run(`SELECT c.*,${freeCourseFields()},
 CASE WHEN e.student_id IS NOT NULL AND ${activeEnrollment} THEN CASE WHEN a.student_id IS NOT NULL OR e.source='order' THEN 'paid' ELSE 'admin_free' END ELSE 'campaign' END access_category,
 CASE WHEN e.student_id IS NOT NULL AND ${activeEnrollment} THEN e.expires_at ELSE (SELECT MAX(f.ends_at) FROM course_free_periods f WHERE f.course_id=c.id AND f.cancelled_at IS NULL AND f.starts_at<=CURRENT_TIMESTAMP(3) AND f.ends_at>CURRENT_TIMESTAMP(3)) END access_expires_at
 FROM courses c LEFT JOIN course_enrollments e ON e.course_id=c.id AND e.student_id=? LEFT JOIN course_paid_access a ON a.student_id=e.student_id AND a.course_id=e.course_id
 WHERE c.id=? AND c.active=1 AND ((e.student_id IS NOT NULL AND ${activeEnrollment}) OR (${activeFreePeriod} AND e.revoked_at IS NULL))`,[student,courseId]);
 if(!rows[0])throw new AppError(403,'COURSE_LOCKED','Khóa học chưa được mở hoặc đã hết hạn. Con chọn khóa học để đăng ký.',{courseId});
 return rows[0];
}
export async function listCourses(student) {
 const rows=await query(`SELECT c.*,e.source,e.starts_at,e.expires_at,e.revoked_at,a.origin paid_origin,${freeCourseFields()},
 EXISTS(SELECT 1 FROM course_payment_qr qr WHERE qr.course_key IN(c.id,'default')) has_payment_qr,
 (SELECT qr.crop_json FROM course_payment_qr qr WHERE qr.course_key IN(c.id,'default') ORDER BY (qr.course_key=c.id) DESC LIMIT 1) payment_qr_crop,
 CASE WHEN c.active=1 AND ((e.student_id IS NOT NULL AND ${activeEnrollment}) OR (${activeFreePeriod} AND e.revoked_at IS NULL)) THEN 1 ELSE 0 END unlocked,
 CASE WHEN e.student_id IS NOT NULL AND ${activeEnrollment} THEN CASE WHEN a.student_id IS NOT NULL OR e.source='order' THEN 'paid' ELSE 'admin_free' END WHEN ${activeFreePeriod} AND e.revoked_at IS NULL THEN 'campaign' ELSE NULL END access_category,
 (SELECT o.status FROM course_orders o WHERE o.student_id=? AND o.course_id=c.id ORDER BY o.created_at DESC,o.id DESC LIMIT 1) order_status
 FROM courses c LEFT JOIN course_enrollments e ON e.course_id=c.id AND e.student_id=? LEFT JOIN course_paid_access a ON a.student_id=e.student_id AND a.course_id=e.course_id ORDER BY c.kind DESC,c.level`,[student,student]);
 return rows.map(c=>({...c,access_expires_at:c.access_category==='campaign'?c.free_ends_at:c.expires_at}));
}
export const createOrder=checkoutMomo;
export const courseConfigSchema=z.object({title:z.string().trim().min(1).max(120),description:z.string().trim().max(5000),price_vnd:z.number().int().min(0).max(100000000).nullable(),duration_days:z.number().int().min(1).max(3650).nullable(),payment_instructions:z.string().trim().max(5000).optional(),active:z.boolean()});
export async function updateCourse(id,body) {
 const d=courseConfigSchema.parse(body);
 const result=await query('UPDATE courses SET title=?,description=?,price_vnd=?,duration_days=?,payment_instructions=COALESCE(?,payment_instructions),active=? WHERE id=?',[d.title,d.description,d.price_vnd,d.duration_days,d.payment_instructions??null,d.active,id]);
 if(!result.affectedRows)throw new AppError(404,'COURSE_NOT_FOUND','Không tìm thấy khóa học');
 return {id};
}
export async function reviewOrder(admin,id,body,transaction=withTransaction) {
 const d=z.object({decision:z.enum(['approved','rejected']),note:z.string().trim().min(1).max(1000)}).parse(body);
 return transaction(async connection=>{
  const run=async(sql,p=[]) => (await connection.query(sql,p))[0];
  const [reviewer]=await run('SELECT role,admin_scope FROM profiles WHERE id=?',[admin]);
  courseReviewCondition(reviewer);
  const [order]=await run('SELECT * FROM course_orders WHERE id=? FOR UPDATE',[id]);
  if(!order)throw new AppError(404,'ORDER_NOT_FOUND','Không tìm thấy yêu cầu');
  const [momo]=await run('SELECT order_id FROM course_momo_payments WHERE order_id=?',[id]);
  if(momo)throw new AppError(409,'MOMO_AUTO_CONFIRM','Giao dịch MoMo được xác nhận tự động; không duyệt thủ công.');
  const [course]=await run('SELECT active,kind FROM courses WHERE id=? FOR UPDATE',[order.course_id]);
  if(adminScopeOf(reviewer)==='chinese'&&course.kind!=='chinese')throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bạn chỉ được xét duyệt đăng ký học phần Tiếng Trung.');
  if(order.status!=='pending')throw new AppError(409,'ORDER_REVIEWED','Yêu cầu đã được xử lý.');
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
