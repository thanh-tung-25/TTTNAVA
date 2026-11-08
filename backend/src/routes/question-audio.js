import {Router} from 'express';
import {z} from 'zod';
import {authenticateToken,requirePlayer} from '../middlewares/auth.js';
import {rateLimit} from '../middlewares/rate-limit.js';
import {asyncHandler,AppError} from '../utils/errors.js';
import {parse} from '../validators/chinese.js';

const router=Router(),cache=new Map(),pending=new Map();
const schema=z.object({text:z.string().trim().min(1).max(180),lang:z.enum(['vi-VN','en-US','zh-CN'])}).strict();
export async function speechAudio(text,lang,fetcher=fetch){
 const key=lang+':'+text,cached=cache.get(key);
 if(cached){cache.delete(key);cache.set(key,cached);return cached;}
 if(pending.has(key))return pending.get(key);
 const work=(async()=>{
  // Fixed provider URL, bounded input; no caller-controlled upstream address.
  const url=new URL('https://translate.google.com/translate_tts');
  url.search=new URLSearchParams({ie:'UTF-8',client:'tw-ob',tl:{'vi-VN':'vi','en-US':'en','zh-CN':'zh-CN'}[lang],q:text});
  const result=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0'}});
  if(!result.ok||!result.headers.get('content-type')?.includes('audio/'))throw new Error('Audio unavailable');
  const bytes=Buffer.from(await result.arrayBuffer());
  if(bytes.length<100||bytes.length>512000)throw new Error('Invalid audio size');
  cache.set(key,bytes);while(cache.size>100)cache.delete(cache.keys().next().value);
  return bytes;
 })();pending.set(key,work);
 try{return await work;}finally{pending.delete(key);}
}
router.post('/',authenticateToken,requirePlayer,rateLimit({windowMs:60000,max:90,keyPrefix:'question-audio'}),asyncHandler(async(req,res)=>{
 const {text,lang}=parse(schema,req.body);
 try{const bytes=await speechAudio(text,lang);res.set({'Content-Type':'audio/mpeg','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}).send(bytes);}
 catch{throw new AppError(502,'AUDIO_UNAVAILABLE','Chưa tải được giọng đọc. Con kiểm tra kết nối rồi bấm nghe lại nhé.');}
}));
export default router;
