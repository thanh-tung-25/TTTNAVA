import { query } from '../config/db.js';
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
 const {payment_instructions,...course}=rows[0];return course;
}
export async function listCourses(student) {
 const rows=await query(`SELECT c.*,e.source,e.starts_at,e.expires_at,e.revoked_at,a.origin paid_origin,${freeCourseFields()},
 CASE WHEN c.active=1 AND ((e.student_id IS NOT NULL AND ${activeEnrollment}) OR (${activeFreePeriod} AND e.revoked_at IS NULL)) THEN 1 ELSE 0 END unlocked,
 CASE WHEN e.student_id IS NOT NULL AND ${activeEnrollment} THEN CASE WHEN a.student_id IS NOT NULL OR e.source='order' THEN 'paid' ELSE 'admin_free' END WHEN ${activeFreePeriod} AND e.revoked_at IS NULL THEN 'campaign' ELSE NULL END access_category,
 (SELECT o.status FROM course_orders o WHERE o.student_id=? AND o.course_id=c.id ORDER BY o.created_at DESC,o.id DESC LIMIT 1) order_status
 FROM courses c LEFT JOIN course_enrollments e ON e.course_id=c.id AND e.student_id=? LEFT JOIN course_paid_access a ON a.student_id=e.student_id AND a.course_id=e.course_id ORDER BY c.kind DESC,c.level`,[student,student]);
 return rows.map(({payment_instructions,...c})=>({...c,access_expires_at:c.access_category==='campaign'?c.free_ends_at:c.expires_at}));
}
export const createOrder=checkoutMomo;
export const courseConfigSchema=z.object({title:z.string().trim().min(1).max(120),description:z.string().trim().max(5000),price_vnd:z.number().int().min(0).max(100000000).nullable(),duration_days:z.number().int().min(1).max(3650).nullable(),active:z.boolean()}).strict();
export async function updateCourse(id,body) {
 const d=courseConfigSchema.parse(body);
 const result=await query('UPDATE courses SET title=?,description=?,price_vnd=?,duration_days=?,active=? WHERE id=?',[d.title,d.description,d.price_vnd,d.duration_days,d.active,id]);
 if(!result.affectedRows)throw new AppError(404,'COURSE_NOT_FOUND','Không tìm thấy khóa học');
 return {id};
}
