import {Router} from 'express';
import multer from 'multer';
import {requireStudent,requireAdmin} from '../middlewares/auth.js';
import {asyncHandler,AppError} from '../utils/errors.js';
import {rateLimit} from '../middlewares/rate-limit.js';
import {speakingAiAvailability} from '../services/chinese-speaking-provider.js';
import {createSpeakingSubmission,assessSpeakingClip,finishSpeakingSubmission,speakingSubmission,speakingResults} from '../services/chinese-speaking-assessment.js';
const router=Router(),handle=fn=>asyncHandler(async(req,res)=>{res.set('Cache-Control','private, no-store');res.json({data:await fn(req)});});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:800044,files:1,fields:0,parts:1}}).single('audio');
const memoryAudio=(req,res,next)=>upload(req,res,error=>{
 if(error){req.file?.buffer.fill(0);return next(new AppError(413,'SPEAKING_AUDIO_LIMIT','Chỉ gửi một đoạn âm thanh WAV, tối đa 25 giây.'));}
 if(!req.file)return next(new AppError(400,'SPEAKING_AUDIO_REQUIRED','Chưa nhận được đoạn trả lời.'));
 next();
});
router.get('/speaking/availability',handle(()=>speakingAiAvailability()));
router.post('/sets/:id/speaking-submissions',requireStudent,rateLimit({windowMs:60000,max:10,keyPrefix:'speaking-create'}),handle(r=>createSpeakingSubmission(r.user,r.params.id,r.body)));
router.post('/speaking-submissions/:id/clips/:question/:chunk',requireStudent,rateLimit({windowMs:60000,max:50,keyPrefix:'speaking-audio'}),memoryAudio,handle(async r=>{
 try{return await assessSpeakingClip(r.user,r.params.id,r.params.question,r.params.chunk,r.file.buffer);}
 finally{r.file.buffer.fill(0);delete r.file;}
}));
router.post('/speaking-submissions/:id/finish',requireStudent,rateLimit({windowMs:60000,max:10,keyPrefix:'speaking-finish'}),handle(r=>finishSpeakingSubmission(r.user,r.params.id)));
router.get('/speaking-submissions/:id',handle(r=>speakingSubmission(r.user,r.params.id)));
router.get('/speaking-results',requireAdmin,handle(()=>speakingResults()));
export default router;
