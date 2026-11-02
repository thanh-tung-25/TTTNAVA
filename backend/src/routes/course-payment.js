import {Router} from 'express';
import multer from 'multer';
import {query} from '../config/db.js';
import {requireAdmin} from '../middlewares/auth.js';
import {AppError,asyncHandler} from '../utils/errors.js';
const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1,fields:0}}).single('qr');
function imageUpload(req,res,next){upload(req,res,error=>{
 if(error)return next(new AppError(error.code==='LIMIT_FILE_SIZE'?413:400,'QR_UPLOAD_INVALID','Chọn một ảnh PNG, JPEG hoặc WebP, tối đa 2 MB.'));
 if(!req.file)return next(new AppError(400,'QR_REQUIRED','Vui lòng chọn ảnh QR.'));
 const b=req.file.buffer;
 const mime=b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png'
  :b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255&&b[b.length-2]===255&&b[b.length-1]===217?'image/jpeg'
  :b.length>=16&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'?'image/webp':null;
 if(!mime)return next(new AppError(415,'QR_TYPE_INVALID','Ảnh QR phải là PNG, JPEG hoặc WebP. Không hỗ trợ SVG.'));
 req.qrMime=mime;next();
});}
async function validateKey(key){
 if(key==='default')return;
 const [course]=await query('SELECT id FROM courses WHERE id=?',[key]);
 if(!course)throw new AppError(404,'COURSE_NOT_FOUND','Không tìm thấy khóa học.');
}
router.get('/admin/pending-count',requireAdmin,asyncHandler(async(_req,res)=>{
 const [row]=await query("SELECT COUNT(*) total FROM course_orders WHERE status='pending'");res.json({data:{total:Number(row.total)}});
}));
router.get('/admin/payment-qr',requireAdmin,asyncHandler(async(_req,res)=>{
 res.json({data:await query('SELECT course_key,mime_type,updated_at FROM course_payment_qr ORDER BY course_key')});
}));
router.post('/admin/payment-qr/:key',requireAdmin,imageUpload,asyncHandler(async(req,res)=>{
 await validateKey(req.params.key);
 await query('INSERT INTO course_payment_qr(course_key,image,mime_type,uploaded_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE image=VALUES(image),mime_type=VALUES(mime_type),uploaded_by=VALUES(uploaded_by)',[req.params.key,req.file.buffer,req.qrMime,req.user.id]);
 res.json({data:{saved:true}});
}));
router.delete('/admin/payment-qr/:key',requireAdmin,asyncHandler(async(req,res)=>{
 await validateKey(req.params.key);await query('DELETE FROM course_payment_qr WHERE course_key=?',[req.params.key]);res.json({data:{saved:true}});
}));
router.get('/payment-qr/:key',asyncHandler(async(req,res)=>{
 await validateKey(req.params.key);
 const [row]=await query("SELECT image,mime_type FROM course_payment_qr WHERE course_key IN (?,'default') ORDER BY course_key=? DESC LIMIT 1",[req.params.key,req.params.key]);
 if(!row)throw new AppError(404,'QR_NOT_CONFIGURED','Admin chưa thêm ảnh QR.');
 res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');res.type(row.mime_type).send(row.image);
}));
export default router;
