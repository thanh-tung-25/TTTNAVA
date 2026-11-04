import {Router} from 'express';
import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {query,withTransaction} from '../config/db.js';
import {archiveFile,sendArchive} from '../services/private-storage.js';
import {requireAdmin} from '../middlewares/auth.js';
import {requireCourse} from '../services/course-service.js';
import {AppError,asyncHandler,notFound} from '../utils/errors.js';
const router=Router(),upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1,fields:0}}).single('image');
router.post('/admin/:id/images',requireAdmin,(req,res,next)=>upload(req,res,error=>{
 if(error)return next(new AppError(400,'IMAGE_UPLOAD','Ảnh tối đa 2 MB.'));
 if(!req.file)return next(new AppError(400,'IMAGE_REQUIRED','Chọn ảnh PNG hoặc JPEG.'));
 next();
}),asyncHandler(async(req,res)=>{
 const [sheet]=await query('SELECT id FROM worksheets WHERE id=?',[req.params.id]);if(!sheet)throw notFound();
 const b=req.file.buffer,mime=b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255&&b[b.length-2]===255&&b[b.length-1]===217?'image/jpeg':null;
 if(!mime)throw new AppError(415,'IMAGE_TYPE','Chỉ nhận ảnh PNG hoặc JPEG.');
 const id=randomUUID();await withTransaction(async connection=>{
  const run=async(sql,p=[]) => (await connection.query(sql,p))[0];
  await run('INSERT INTO worksheet_images(id,worksheet_id,image,mime_type) VALUES (?,?,?,?)',[id,sheet.id,b,mime]);
  await archiveFile('worksheet_images/'+id,b,mime,'worksheet-image',run);
 });res.json({data:{id}});
}));
router.get('/images/:id',asyncHandler(async(req,res)=>{
 const [image]=await query('SELECT i.*,w.grade,w.status FROM worksheet_images i JOIN worksheets w ON w.id=i.worksheet_id WHERE i.id=?',[req.params.id]);if(!image)throw notFound();
 if(req.user.role!=='admin'){
  await requireCourse(req.user.id,'grade-'+image.grade);
  if(image.status!=='published'&&!(await query('SELECT id FROM worksheet_attempts WHERE worksheet_id=? AND student_id=? LIMIT 1',[image.worksheet_id,req.user.id])).length)throw notFound();
 }
 await sendArchive(res,'worksheet_images/'+image.id,image.image,image.mime_type);
}));
export default router;
