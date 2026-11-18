import {query} from '../config/db.js';
import {courseReviewCondition} from './course-service.js';

// A registration-year grant supersedes the old manual registration label.
// Keep each original order intact; real MoMo orders retain their own status.
const converted="m.order_id IS NULL AND rf.student_id IS NOT NULL";
const fields=`o.*,c.title,m.state momo_state,m.pay_url,m.transaction_id,m.paid_at,
 CASE WHEN ${converted} THEN 'admin_free' ELSE o.status END display_status,
 CASE WHEN ${converted} THEN 0 ELSE o.amount_vnd END display_amount_vnd,
 CASE WHEN ${converted} THEN COALESCE(g.starts_at,rf.registered_at) ELSE NULL END free_starts_at,
 CASE WHEN ${converted} THEN COALESCE(g.ends_at,rf.ends_at) ELSE NULL END free_ends_at,
 CASE WHEN ${converted} THEN g.revoked_at ELSE NULL END free_revoked_at`;
const joins=`FROM course_orders o JOIN courses c ON c.id=o.course_id
 LEFT JOIN course_momo_payments m ON m.order_id=o.id
 LEFT JOIN course_registration_free rf ON rf.student_id=o.student_id AND rf.course_id=o.course_id
 LEFT JOIN course_free_grants g ON g.student_id=o.student_id AND g.course_id=o.course_id`;

export function studentCourseOrders(student){
 return query(`SELECT ${fields} ${joins} WHERE o.student_id=? ORDER BY o.created_at DESC,o.id DESC LIMIT 200`,[student]);
}
export function adminCourseOrders(admin){
 return query(`SELECT ${fields},p.username,p.display_name,a.username reviewer ${joins}
 JOIN profiles p ON p.id=o.student_id LEFT JOIN profiles a ON a.id=o.reviewed_by
 WHERE ${courseReviewCondition(admin)}
 ORDER BY (o.status='pending' AND m.order_id IS NOT NULL) DESC,o.created_at DESC,o.id DESC LIMIT 500`);
}
