import {createHash} from 'node:crypto';
import * as webpush from 'web-push';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {parse} from '../validators/chinese.js';
import {AppError,badRequest} from '../utils/errors.js';
import {callConfig,requireCalls} from './chat-call-config.js';

const uuid=z.string().uuid();
export function validPushEndpoint(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash&&[
   'fcm.googleapis.com','updates.push.services.mozilla.com','push.apple.com','notify.windows.com',
  ].some(host=>url.hostname===host||((host==='push.apple.com'||host==='notify.windows.com')&&url.hostname.endsWith('.'+host)));
 }catch{return false;}
}
export async function subscribe(user,body,token){
 requireCalls();if(!callConfig().pushEnabled)throw new AppError(503,'PUSH_DISABLED','Thông báo ngoài website chưa được bật.');
 const d=parse(z.object({device_id:uuid,subscription:z.object({endpoint:z.string().max(2048).refine(validPushEndpoint),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),auth:z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/)}).strict()}).strict()}).strict(),body);
 if(Buffer.from(d.subscription.keys.p256dh,'base64url').length!==65||Buffer.from(d.subscription.keys.auth,'base64url').length!==16)throw badRequest('Thiết bị chưa đăng ký được thông báo.');
 const hash=createHash('sha256').update(d.subscription.endpoint).digest('hex');
 const sessionHash=createHash('sha256').update(token).digest('hex');
 await withTransaction(async c=>{
  await c.query('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user]);
  await c.query('DELETE FROM chat_push_subscriptions WHERE endpoint_hash=? OR (student_id=? AND device_id=?)',[hash,user,d.device_id]);
  await c.query('INSERT INTO chat_push_subscriptions(endpoint_hash,student_id,device_id,session_hash,endpoint,p256dh,auth) VALUES (?,?,?,?,?,?,?)',[hash,user,d.device_id,sessionHash,d.subscription.endpoint,d.subscription.keys.p256dh,d.subscription.keys.auth]);
 });return {subscribed:true};
}
export async function unsubscribe(user,body){
 const {device_id}=parse(z.object({device_id:uuid}).strict(),body);
 await forgetDevice(user,device_id);return {subscribed:false};
}
export async function forgetDevice(user,deviceId,token){
 if(!user)return;
 const filters=[],params=[user];
 if(uuid.safeParse(deviceId).success){filters.push('device_id=?');params.push(deviceId);}
 if(token){filters.push('session_hash=?');params.push(createHash('sha256').update(token).digest('hex'));}
 if(!filters.length)return;
 try{await query(`DELETE FROM chat_push_subscriptions WHERE student_id=? AND (${filters.join(' OR ')})`,params);}
 catch(error){if(!['ER_NO_SUCH_TABLE','42P01'].includes(error.code))throw error;}
}
export async function notifyIncomingCall(user,callId){
 if(!callConfig().pushEnabled)return;
 // Never accept a destination URL or push payload from the caller.
 try{
  const rows=await query('SELECT * FROM chat_push_subscriptions WHERE student_id=? ORDER BY updated_at DESC LIMIT 5',[user]);
  await Promise.allSettled(rows.map(async row=>{
   if(!validPushEndpoint(row.endpoint))return;
   try{
    await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify({type:'incoming-call',call_id:callId}),{
     vapidDetails:{subject:process.env.WEB_PUSH_SUBJECT,publicKey:process.env.WEB_PUSH_PUBLIC_KEY,privateKey:process.env.WEB_PUSH_PRIVATE_KEY},
     TTL:40,urgency:'high',timeout:5000,
    });
   }catch(error){
    if(error.statusCode===404||error.statusCode===410)await query('DELETE FROM chat_push_subscriptions WHERE endpoint_hash=?',[row.endpoint_hash]);
    // Do not log endpoints, encryption keys, or provider response bodies.
   }
  }));
 }catch{/* Notification delivery must never break an in-site call. */}
}
