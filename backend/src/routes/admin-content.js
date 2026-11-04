import {Router} from 'express';
import {z} from 'zod';
import {authenticateToken,requireAdminScope} from '../middlewares/auth.js';
import {query,withTransaction,jsonArrayLength} from '../config/db.js';
import {asyncHandler,notFound} from '../utils/errors.js';
import {randomUUID} from 'node:crypto';
import {publishLessonQuestions} from '../services/question-bulk-publish.js';
import {sendArchive,DOCX_MIME} from '../services/private-storage.js';
const router=Router();router.use(authenticateToken,requireAdminScope('primary'));
router.get('/word-documents',asyncHandler(async(req,res)=>{
 const f=z.object({q:z.string().trim().max(100).default(''),grade:z.coerce.number().int().min(1).max(5).optional(),semester:z.enum(['hk1','hk2']).optional(),page:z.coerce.number().int().min(1).default(1)}).parse(req.query);
 const where=[],params=[];
 if(f.q){where.push('(d.filename LIKE ? OR l.name LIKE ?)');params.push('%'+f.q+'%','%'+f.q+'%');}
 if(f.grade){where.push('c.grade=?');params.push(f.grade);}if(f.semester){where.push('c.semester=?');params.push(f.semester);}
 const from=' FROM word_import_documents d JOIN curriculum_lessons l ON l.id=d.lesson_id JOIN curriculum_chapters c ON c.id=l.chapter_id LEFT JOIN profiles p ON p.id=d.imported_by'+(where.length?' WHERE '+where.join(' AND '):'');
 const [count]=await query('SELECT COUNT(*) total'+from,params);
 const rows=await query('SELECT d.id,d.filename,d.byte_size,d.question_count,d.imported_at,d.lesson_id,l.name lesson_name,c.grade,c.semester,c.subject_id,c.name chapter_name,c.school_year_id,p.display_name imported_by_name'+from+' ORDER BY d.imported_at DESC,d.id LIMIT 20 OFFSET ?',[...params,(f.page-1)*20]);
 res.json({data:rows,pagination:{page:f.page,total:Number(count.total),limit:20}});
}));
router.get('/word-documents/:id/download',asyncHandler(async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 const [document]=await query('SELECT filename,original,byte_size FROM word_import_documents WHERE id=?',[id]);if(!document)throw notFound();
 res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':`attachment; filename="document.docx"; filename*=UTF-8''${encodeURIComponent(document.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,'Cache-Control':'private, no-store'});
 await sendArchive(res,'word_import_documents/'+id,document.original,DOCX_MIME,document.filename);
}));
router.post('/publish-questions',asyncHandler(async(req,res)=>{
 const {lessonId}=z.object({lessonId:z.string().trim().min(1).max(90)}).parse(req.body);
 res.json({data:await publishLessonQuestions(lessonId,req.user.id)});
}));
router.get('/',asyncHandler(async(req,res)=>{
 const filters=z.object({q:z.string().trim().max(100).default(''),kind:z.enum(['','worksheet','question']).default(''),grade:z.coerce.number().int().min(1).max(5).optional(),status:z.enum(['','draft','published','hidden']).default(''),page:z.coerce.number().int().min(1).default(1),yearId:z.string().max(20).optional(),semester:z.enum(['hk1','hk2']).optional(),subjectId:z.enum(['toan','tieng-viet','tieng-anh']).optional(),chapterId:z.string().max(90).optional(),lessonId:z.string().max(90).optional(),unassigned:z.enum(['1']).optional()}).parse(req.query);
 const scopeWhere=[],scopeParams=[];
 for(const [key,column]of Object.entries({yearId:'c.school_year_id',semester:'c.semester',subjectId:'c.subject_id',chapterId:'c.id',lessonId:'l.id'}))if(filters[key]){scopeWhere.push(column+'=?');scopeParams.push(filters[key]);}
 const scope=scopeWhere.length?' AND '+scopeWhere.join(' AND '):'';
 const wsCondition=filters.unassigned?' AND w.lesson_id IS NULL':scopeWhere.length?` AND EXISTS (SELECT 1 FROM curriculum_lessons l JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.id=w.lesson_id${scope})`:'';
 const qCondition=filters.unassigned?' AND NOT EXISTS (SELECT 1 FROM curriculum_lessons l WHERE l.topic_id=q.topic_id)':scopeWhere.length?` AND EXISTS (SELECT 1 FROM curriculum_lessons l JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.topic_id=q.topic_id${scope})`:'';
 const union=`SELECT w.id,w.title,w.grade,w.subject_id,w.status,w.updated_at,'worksheet' kind,${jsonArrayLength('w.items')} item_count,w.version,(SELECT COUNT(*) FROM worksheet_attempts a WHERE a.worksheet_id=w.id) attempt_count FROM worksheets w WHERE 1=1${wsCondition}
 UNION ALL SELECT q.id,q.prompt title,t.grade,t.subject_id,CASE WHEN q.status='visible' THEN 'draft' ELSE q.status END status,q.updated_at,'question' kind,1 item_count,0 version,0 attempt_count FROM questions q JOIN topics t ON t.id=q.topic_id WHERE 1=1${qCondition}`;
 const where=[],params=[];for(const key of ['kind','grade','status'])if(filters[key]){where.push('u.'+key+'=?');params.push(filters[key]);}
 if(filters.q){where.push('(u.title LIKE ? OR u.id LIKE ?)');params.push('%'+filters.q+'%','%'+filters.q+'%');}
 const from='FROM ('+union+') u'+(where.length?' WHERE '+where.join(' AND '):'');
 const allParams=[...(filters.unassigned?[]:[...scopeParams,...scopeParams]),...params];
 const [count]=await query('SELECT COUNT(*) total '+from,allParams);
 const rows=await query('SELECT u.* '+from+' ORDER BY u.updated_at DESC,u.kind,u.id LIMIT 20 OFFSET ?',[...allParams,(filters.page-1)*20]);
 res.json({data:rows,pagination:{page:filters.page,total:Number(count.total),limit:20}});
}));
router.post('/chapters',asyncHandler(async(req,res)=>{
 const d=z.object({yearId:z.string().min(1).max(20),grade:z.number().int().min(1).max(5),semester:z.enum(['hk1','hk2']),subjectId:z.enum(['toan','tieng-viet','tieng-anh']),name:z.string().trim().min(1).max(160)}).parse(req.body);
 const id='custom-'+randomUUID();
 if(!(await query('SELECT id FROM school_years WHERE id=?',[d.yearId])).length)throw notFound();
 await query('INSERT INTO curriculum_chapters (id,school_year_id,grade,semester,subject_id,name,slug,sort_order) VALUES (?,?,?,?,?,?,?,200)',[id,d.yearId,d.grade,d.semester,d.subjectId,d.name,id]);
 res.json({data:{id}});
}));
router.post('/lessons',asyncHandler(async(req,res)=>{
 const d=z.object({chapterId:z.string().min(1).max(90),name:z.string().trim().min(1).max(120)}).parse(req.body);
 const id='custom-'+randomUUID();
 await withTransaction(async c=>{
  const [rows]=await c.query('SELECT grade,subject_id FROM curriculum_chapters WHERE id=? FOR UPDATE',[d.chapterId]);if(!rows[0])throw notFound();
  const [counts]=await c.query('SELECT COALESCE(MAX(sort_order),0) n FROM curriculum_lessons WHERE chapter_id=?',[d.chapterId]);
  const order=Math.min(Number(counts[0].n)+1,255);
  await c.query('INSERT INTO topics (id,subject_id,grade,name,slug,sort_order) VALUES (?,?,?,?,?,?)',[id,rows[0].subject_id,rows[0].grade,d.name,id,order]);
  await c.query('INSERT INTO curriculum_lessons (id,chapter_id,topic_id,name,sort_order) VALUES (?,?,?,?,?)',[id,d.chapterId,id,d.name,order]);
 });res.json({data:{id}});
}));
export default router;
