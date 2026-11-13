import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {z} from 'zod';
import env from '../config/env.js';
import {AppError} from '../utils/errors.js';
const schema=z.object({v:z.literal(2),owner:z.string().uuid(),session:z.string().uuid(),turn:z.number().int().min(0).max(20),until:z.number().int(),context:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().max(400)}).strict()).max(6)}).strict();
const key=()=>createHash('sha256').update('ttnava-private-chat-v2\0'+env.jwt.secret).digest();
export function sealChatState(state){
 const input=Buffer.from(JSON.stringify(schema.parse(state))),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from('ttnava-chat-v2'));
 try{return Buffer.concat([iv,cipher.update(input),cipher.final(),cipher.getAuthTag()]).toString('base64url');}finally{input.fill(0);}
}
export function openChatState(token,user,id){
 let plain;
 try{
  if(typeof token!=='string'||token.length<60||token.length>40000||!/^[A-Za-z0-9_-]+$/.test(token))throw Error();
  const data=Buffer.from(token,'base64url'),decipher=createDecipheriv('aes-256-gcm',key(),data.subarray(0,12));decipher.setAAD(Buffer.from('ttnava-chat-v2'));decipher.setAuthTag(data.subarray(-16));
  plain=Buffer.concat([decipher.update(data.subarray(12,-16)),decipher.final()]);const state=schema.parse(JSON.parse(plain.toString('utf8')));
  if(state.owner!==user.id||state.session!==id||state.until<=Date.now())throw Error();return state;
 }catch{throw new AppError(409,'CHAT_STATE_INVALID','Phiên trò chuyện đã đổi hoặc hết hạn. Con bắt đầu lại nhé.');}finally{plain?.fill(0);}
}
