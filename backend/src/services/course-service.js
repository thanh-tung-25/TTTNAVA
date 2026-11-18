import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {freeCourseFields} from './course-free-periods.js';
import {checkoutMomo} from './course-momo.js';
import {activeFreeGrant,effectiveEnrollment,courseAccessCondition} from './course-access-policy.js';
export {activeEnrollment} from './course-access-policy.js';

export function courseReviewCondition(user){
 const scope=adminScopeOf(user);
 if(scope==='super')return '1=1';
 if(scope==='chinese')return "c.kind='chinese'";
 throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bạn không có quyền xét duyệt đăng ký học phần này.');
}

export async function requireCourse(student, courseId, run=query) {
 const rows=await run(`SELECT c.*,${freeCourseFields()},
 CASE WHEN e.student_id IS NOT NULL AND ${effectiveEnrollment} THEN CASE WHEN a.student_id IS NOT NULL OR e.source='order' THEN 'paid' ELSE 'admin_free' END ELSE 'admin_free' END access_category,
 CASE WHEN e.student_id IS NOT NULL AND ${effectiveEnrollment} THEN e.expires_at ELSE g.ends_at END access_expires_at
 FROM courses c LEFT JOIN course_enrollments e ON e.course_id=c.id AND e.student_id=? LEFT JOIN course_paid_access a ON a.student_id=e.student_id AND a.course_id=e.course_id
 LEFT JOIN course_free_grants g ON g.course_id=c.id AND g.student_id=?
 LEFT JOIN course_registration_free r ON r.student_id=COALESCE(e.student_id,g.student_id) AND r.course_id=c.id
 WHERE c.id=? AND ${courseAccessCondition}`,[student,student,courseId]);
 if(!rows[0])throw new AppError(403,'COURSE_LOCKED','Khóa học chưa được mở hoặc đã hết hạn. Con chọn khóa học để đăng ký.',{courseId});
 const {payment_instructions,...course}=rows[0];return course;
}
export async function listCourses(student) {
 const rows=await query(`SELECT c.*,CASE WHEN r.student_id IS NOT NULL AND (a.origin IS NULL OR a.origin<>'momo') THEN 'registration_free' ELSE e.source END source,e.starts_at,e.expires_at,e.revoked_at,CASE WHEN r.student_id IS NOT NULL AND (a.origin IS NULL OR a.origin<>'momo') THEN NULL ELSE a.origin END paid_origin,g.id grant_id,g.starts_at grant_starts_at,g.ends_at grant_ends_at,g.revoked_at grant_revoked_at,${freeCourseFields()},
 CASE WHEN ${courseAccessCondition} THEN 1 ELSE 0 END unlocked,
 CASE WHEN e.student_id IS NOT NULL AND ${effectiveEnrollment} THEN CASE WHEN a.student_id IS NOT NULL OR e.source='order' THEN 'paid' ELSE 'admin_free' END WHEN ${activeFreeGrant} THEN 'admin_free' ELSE NULL END access_category,
 CASE WHEN e.student_id IS NOT NULL AND ${effectiveEnrollment} THEN e.expires_at WHEN ${activeFreeGrant} THEN g.ends_at ELSE NULL END access_expires_at,
 (SELECT o.status FROM course_orders o WHERE o.student_id=? AND o.course_id=c.id ORDER BY o.created_at DESC,o.id DESC LIMIT 1) order_status
 FROM courses c LEFT JOIN course_enrollments e ON e.course_id=c.id AND e.student_id=? LEFT JOIN course_paid_access a ON a.student_id=e.student_id AND a.course_id=e.course_id LEFT JOIN course_free_grants g ON g.course_id=c.id AND g.student_id=? LEFT JOIN course_registration_free r ON r.student_id=COALESCE(e.student_id,g.student_id) AND r.course_id=c.id ORDER BY c.kind DESC,c.level`,[student,student,student]);
 return rows.map(({payment_instructions,...c})=>({...c,access_expires_at:c.access_category==='campaign'?c.free_ends_at:c.access_expires_at}));
}
export const createOrder=checkoutMomo;
export const courseConfigSchema=z.object({title:z.string().trim().min(1).max(120),description:z.string().trim().max(5000),price_vnd:z.number().int().min(0).max(100000000).nullable(),duration_days:z.number().int().min(1).max(3650).nullable(),active:z.boolean()}).strict();
export async function updateCourse(id,body) {
 const d=courseConfigSchema.parse(body);
 const result=await query('UPDATE courses SET title=?,description=?,price_vnd=?,duration_days=?,active=? WHERE id=?',[d.title,d.description,d.price_vnd,d.duration_days,d.active,id]);
 if(!result.affectedRows)throw new AppError(404,'COURSE_NOT_FOUND','Không tìm thấy khóa học');
 return {id};
}
