import {Router} from 'express';
import {authenticateToken,requireAdmin,requireStudent} from '../middlewares/auth.js';
import {requireSchoolAdmin,assertSchoolResource,schoolGradeCondition} from '../middlewares/school-admin.js';
import {asyncHandler,notFound,badRequest} from '../utils/errors.js';
import {query,jsonArrayLength,jsonText} from '../config/db.js';
import {requireCourse} from '../services/course-service.js';
import * as service from '../services/worksheets.js';
import {validateSheet,gradeItem,validateResponses,publicItem} from '../services/worksheet-rules.js';
import imageRouter from './worksheet-images.js';
import {rateLimit} from '../middlewares/rate-limit.js';
import {deleteWorksheet} from '../services/worksheet-delete.js';
const router=Router();router.use(authenticateToken);
router.use(asyncHandler(async(req,res,next)=>{
 if(req.user.role==='admin'){
  await new Promise((resolve,reject)=>requireSchoolAdmin(req,res,error=>error?reject(error):resolve()));
  const parts=req.path.split('/').filter(Boolean);
  if(parts[0]==='admin'&&parts[1]==='reviews'&&parts[2])await assertSchoolResource(req,'attempt',parts[2]);
  else if(parts[0]==='admin'&&parts[1]&&!['reviews','preview'].includes(parts[1]))await assertSchoolResource(req,'worksheet',parts[1]);
  else if(parts[0]==='images'&&parts[1])await assertSchoolResource(req,'image',parts[1]);
 }
 next();
}));
router.use(imageRouter);
const handle=fn=>asyncHandler(async(req,res)=>res.json({data:await fn(req)}));
router.get('/admin',requireAdmin,handle(r=>query(`SELECT id,title,grade,subject_id,status,version,${jsonArrayLength('items')} item_count FROM worksheets WHERE ${schoolGradeCondition(r.schoolProgram)} ORDER BY updated_at DESC`)));
router.post('/admin',requireAdmin,handle(r=>service.save(r.user.id,null,r.body)));
router.get('/admin/reviews',requireAdmin,handle(r=>query(`SELECT a.id,a.student_id,a.status,a.submitted_at,p.display_name,p.username,${jsonText('a.snapshot','title')} title FROM worksheet_attempts a JOIN profiles p ON p.id=a.student_id WHERE a.status='pending_review' AND ${schoolGradeCondition(r.schoolProgram,'a.grade')} ORDER BY a.submitted_at LIMIT 200`)));
router.get('/admin/reviews/:id',requireAdmin,handle(async r=>{const [a]=await query('SELECT * FROM worksheet_attempts WHERE id=?',[r.params.id]);if(!a)throw notFound();return {...a,snapshot:service.json(a.snapshot),answers:service.json(a.answers),results:service.json(a.results)};}));
router.post('/admin/reviews/:id',requireAdmin,handle(r=>service.review(r.user.id,r.params.id,r.body)));
router.post('/admin/preview',requireAdmin,handle(r=>{
 const item=validateSheet({title:'Xem thử',grade:1,subject_id:'toan',status:'draft',items:[r.body.item]}).items[0];
 const responses=validateResponses([item],{[item.id]:r.body.answer});return gradeItem(item,responses[item.id]);
}));
router.get('/admin/:id',requireAdmin,handle(r=>service.sheet(r.params.id,true)));
router.put('/admin/:id',requireAdmin,handle(r=>service.save(r.user.id,r.params.id,r.body)));
router.delete('/admin/:id',requireAdmin,handle(r=>deleteWorksheet(r.params.id,r.query.version)));
router.get('/',requireStudent,handle(async r=>{
 const course=await requireCourse(r.user.id,r.get('X-Course-Id')||'grade-'+r.user.grade);
 if(!['primary','secondary'].includes(course.kind))throw badRequest('Bài tập này dành cho khóa Tiểu học hoặc THCS.');
 return query(`SELECT w.id,w.title,w.subject_id,c.semester,c.id chapter_id,c.name chapter_name,l.name lesson_name,${jsonArrayLength('w.items')} item_count,(SELECT a.id FROM worksheet_attempts a WHERE a.worksheet_id=w.id AND a.student_id=? AND a.status='in_progress' LIMIT 1) active_attempt FROM worksheets w LEFT JOIN curriculum_lessons l ON l.id=w.lesson_id LEFT JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE w.grade=? AND w.status='published' ORDER BY c.semester,c.sort_order,l.sort_order,w.updated_at DESC`,[r.user.id,course.level]);
}));
router.get('/history',requireStudent,handle(r=>query(`SELECT id,worksheet_id,status,score,submitted_at,started_at,grade,${jsonText('snapshot','title')} title FROM worksheet_attempts WHERE student_id=? ORDER BY started_at DESC LIMIT 200`,[r.user.id])));
router.get('/attempts/:id',requireStudent,handle(r=>service.attempt(r.user.id,r.params.id)));
router.put('/attempts/:id',requireStudent,handle(r=>service.answer(r.user.id,r.params.id,r.body.answers)));
router.post('/attempts/:id/submit',requireStudent,handle(r=>service.answer(r.user.id,r.params.id,r.body.answers,true)));
router.get('/:id',requireStudent,handle(r=>service.sheet(r.params.id,false,r.user.id)));
router.post('/:id/start',requireStudent,rateLimit({windowMs:60000,max:20,keyPrefix:'worksheet-start'}),handle(r=>service.start(r.user.id,r.params.id)));
export default router;
