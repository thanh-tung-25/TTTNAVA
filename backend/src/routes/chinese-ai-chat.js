import {Router} from 'express';
import multer from 'multer';
import {requireAdmin} from '../middlewares/auth.js';
import {asyncHandler,AppError} from '../utils/errors.js';
import {rateLimit} from '../middlewares/rate-limit.js';
import {chatMetadata,saveChatSettings,startChat,getChat,answerChat,finishChat,chatResults} from '../services/chinese-ai-chat.js';
const router=Router(),handle=fn=>asyncHandler(async(req,res)=>{res.set('Cache-Control','private, no-store');res.json({data:await fn(req)});});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:640044,files:1,fields:0,parts:1}}).single('audio');
const audio=(req,res,next)=>upload(req,res,error=>{
 if(error){req.file?.buffer.fill(0);return next(new AppError(413,'CHAT_AUDIO_LIMIT','Chỉ gửi một đoạn WAV, tối đa 20 giây.'));}
 if(!req.file)return next(new AppError(400,'CHAT_AUDIO_REQUIRED','Chưa có bản ghi âm.'));
 next();
});
router.get('/ai-chat',handle(r=>chatMetadata(r.user,r.query.level||1)));
router.put('/ai-chat/lessons/:id',requireAdmin,handle(r=>saveChatSettings(r.user,r.params.id,r.body)));
router.get('/ai-chat/results',requireAdmin,handle(r=>chatResults(r.query.level||1)));
router.post('/ai-chat/sessions',rateLimit({windowMs:60000,max:8,keyPrefix:'ai-chat-start'}),handle(r=>startChat(r.user,r.body)));
router.get('/ai-chat/sessions/:id',handle(r=>getChat(r.user,r.params.id)));
router.post('/ai-chat/sessions/:id/turns/:turn/:requestId/text',rateLimit({windowMs:60000,max:12,keyPrefix:'ai-chat-turn'}),handle(r=>answerChat(r.user,r.params.id,r.params.turn,r.params.requestId,r.body)));
router.post('/ai-chat/sessions/:id/turns/:turn/:requestId/audio',rateLimit({windowMs:60000,max:12,keyPrefix:'ai-chat-turn'}),audio,handle(async r=>{
 try{return await answerChat(r.user,r.params.id,r.params.turn,r.params.requestId,r.file.buffer);}
 finally{r.file.buffer.fill(0);delete r.file;}
}));
router.post('/ai-chat/sessions/:id/finish',handle(r=>finishChat(r.user,r.params.id)));
export default router;
