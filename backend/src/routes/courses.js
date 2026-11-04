import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireStudent, requireAdmin, requireSuperAdmin } from '../middlewares/auth.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { query, withTransaction, dialectSql } from '../config/db.js';
import { listCourses, requireCourse, createOrder, updateCourse, reviewOrder } from '../services/course-service.js';
import { rateLimit } from '../middlewares/rate-limit.js';
import paymentRouter from './course-payment.js';
const router=Router();router.use(authenticateToken);
router.use('/admin',requireSuperAdmin);
router.use(paymentRouter);
const handle=fn=>asyncHandler(async(req,res)=>res.json({data:await fn(req)}));
router.get('/',requireStudent,handle(r=>listCourses(r.user.id)));
router.get('/orders',requireStudent,handle(r=>query('SELECT o.*,c.title FROM course_orders o JOIN courses c ON c.id=o.course_id WHERE student_id=? ORDER BY created_at DESC LIMIT 200',[r.user.id])));
router.post('/orders',requireStudent,rateLimit({windowMs:60000,max:10,keyPrefix:'course-order'}),handle(r=>createOrder(r.user.id,r.body)));
router.post('/orders/:id/cancel',requireStudent,handle(async r=>{
 const result=await query("UPDATE course_orders SET status='cancelled',reviewed_at=CURRENT_TIMESTAMP(3) WHERE id=? AND student_id=? AND status='pending'",[r.params.id,r.user.id]);
 if(!result.affectedRows)throw new AppError(409,'ORDER_NOT_PENDING','Yêu cầu không còn ở trạng thái chờ.');return {id:r.params.id};
}));
router.get('/admin/catalog',requireAdmin,handle(()=>query('SELECT * FROM courses ORDER BY kind DESC,level')));
router.get('/admin/orders',requireAdmin,handle(()=>query(`SELECT o.*,c.title,p.username,p.display_name,a.username reviewer FROM course_orders o JOIN courses c ON c.id=o.course_id JOIN profiles p ON p.id=o.student_id LEFT JOIN profiles a ON a.id=o.reviewed_by ORDER BY o.status='pending' DESC,o.created_at DESC LIMIT 500`)));
router.patch('/admin/catalog/:id',requireAdmin,handle(r=>updateCourse(r.params.id,r.body)));
router.post('/admin/payment-instructions',requireAdmin,handle(async r=>{const text=z.string().trim().min(1).max(5000).parse(r.body.instructions);await query('UPDATE courses SET payment_instructions=?',[text]);return {saved:true};}));
router.post('/admin/orders/:id/review',requireAdmin,handle(r=>reviewOrder(r.user.id,r.params.id,r.body)));
router.get('/admin/enrollments',requireAdmin,handle(()=>query(`SELECT e.*,c.title,p.username,p.display_name FROM course_enrollments e JOIN profiles p ON p.id=e.student_id JOIN courses c ON c.id=e.course_id ORDER BY e.starts_at DESC LIMIT 500`)));
router.get('/admin/audit',requireAdmin,handle(()=>query(`SELECT a.*,p.username,c.title,u.username actor FROM course_access_audit a JOIN profiles p ON p.id=a.student_id JOIN courses c ON c.id=a.course_id LEFT JOIN profiles u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 200`)));
router.post('/admin/access',requireAdmin,handle(async r=>{
 const d=z.object({username:z.string().trim().min(3).max(20),course_id:z.string().max(32),action:z.enum(['grant','revoke']),duration_days:z.number().int().min(1).max(3650).nullable().default(null),note:z.string().trim().min(1).max(1000)}).parse(r.body);
 return withTransaction(async c=>{
  const [students]=await c.query(dialectSql("SELECT id FROM profiles WHERE username=? AND role='student' FOR UPDATE", "SELECT id FROM profiles WHERE lower(username)=lower(?) AND role='student' FOR UPDATE"),[d.username]);
  d.student_id=students[0]?.id;
  const [courses]=await c.query('SELECT id FROM courses WHERE id=?',[d.course_id]);
  if(!students[0]||!courses[0])throw new AppError(404,'NOT_FOUND','Không tìm thấy học sinh hoặc khóa học.');
  if(d.action==='grant')await c.query(dialectSql(
   `INSERT INTO course_enrollments(student_id,course_id,source,granted_by,expires_at) VALUES (?,?,'admin',?,?) ON DUPLICATE KEY UPDATE source='admin',granted_by=VALUES(granted_by),starts_at=CURRENT_TIMESTAMP(3),expires_at=VALUES(expires_at),revoked_at=NULL`,
   `INSERT INTO course_enrollments(student_id,course_id,source,granted_by,expires_at) VALUES (?,?,'admin',?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET source='admin',granted_by=EXCLUDED.granted_by,starts_at=CURRENT_TIMESTAMP(3),expires_at=EXCLUDED.expires_at,revoked_at=NULL`,
  ),[d.student_id,d.course_id,r.user.id,d.duration_days?new Date(Date.now()+d.duration_days*86400000):null]);
  else await c.query('UPDATE course_enrollments SET revoked_at=CURRENT_TIMESTAMP(3) WHERE student_id=? AND course_id=?',[d.student_id,d.course_id]);
  await c.query('INSERT INTO course_access_audit(student_id,course_id,actor_id,action,note) VALUES (?,?,?,?,?)',[d.student_id,d.course_id,r.user.id,d.action,d.note]);return {saved:true};
 });
}));
router.get('/:id/access',requireStudent,handle(r=>requireCourse(r.user.id,r.params.id)));
export default router;
