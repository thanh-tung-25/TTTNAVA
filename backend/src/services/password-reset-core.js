import {createHmac,randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {AppError} from '../utils/errors.js';
import {normalizeGmail} from '../utils/gmail.js';

const OTP_LIFETIME=300_000,SESSION_LIFETIME=300_000,RESEND_DELAY=60_000,SEND_WINDOW=3_600_000,MAX_SENDS=5,MAX_ATTEMPTS=5;
const invalidCode=()=>new AppError(400,'INVALID_RESET_OTP','Mã xác thực không đúng, đã dùng hoặc đã hết hạn. Bạn có thể yêu cầu mã mới.');
const invalidSession=()=>new AppError(400,'INVALID_RESET_SESSION','Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Bạn hãy xác minh email lại.');
export function createPasswordResetService({query,withTransaction,dialectSql,secret,hashPassword,sendOtp,available,clock=()=>new Date()}){
 const digest=(purpose,...parts)=>createHmac('sha256',secret).update(JSON.stringify(['password-reset-v1',purpose,...parts])).digest('hex');
 const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===64&&b.length===64&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
 const credential=profile=>digest('credential',profile.id,profile.email,Number(profile.student_auth_version||0),profile.password_hash);
 const eligible=profile=>{
  if(!profile||profile.role!=='student'||profile.deleted_at||!profile.email_verified_at||!profile.password_hash)return false;
  try{return Boolean(normalizeGmail(profile.email).identity);}catch{return false;}
 };
 const tx=fn=>withTransaction(connection=>fn(async(sql,params=[])=>(await connection.query(sql,params))[0]));
 const ready=()=>{if(!available())throw new AppError(503,'PASSWORD_RESET_UNAVAILABLE','Lấy lại mật khẩu đang tạm chưa khả dụng. Bạn vui lòng thử lại sau.');};
 const retry=milliseconds=>new AppError(429,'RESET_RATE_LIMITED','Bạn đã yêu cầu mã quá nhanh. Vui lòng chờ rồi thử lại.',{retryAfterSeconds:Math.max(1,Math.ceil(milliseconds/1000))});
 async function lookup(run,gmail){
  const legacy=dialectSql("CONCAT(REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(LOWER(email),'@',1),'+',1),'.',''),'@gmail.com')","replace(split_part(split_part(lower(email),'@',1),'+',1),'.','') || '@gmail.com'");
  const profiles=await run(`SELECT * FROM profiles WHERE role='student' AND deleted_at IS NULL AND email_verified_at IS NOT NULL AND (gmail_identity=? OR LOWER(email)=? OR (LOWER(email) LIKE '%@gmail.com' AND ${legacy}=?)) ORDER BY id LIMIT 2`,[gmail.identity,gmail.email,gmail.identity]);
  return profiles.length===1&&eligible(profiles[0])&&normalizeGmail(profiles[0].email).identity===gmail.identity?profiles[0]:null;
 }
 async function request(rawEmail){
  ready();const gmail=normalizeGmail(rawEmail),id=randomUUID(),otp=String(randomInt(0,1_000_000)).padStart(6,'0'),now=clock(),key=digest('email',gmail.identity),expires=new Date(now.getTime()+OTP_LIFETIME),resend=new Date(now.getTime()+RESEND_DELAY);
  await tx(async run=>{
   const profile=await lookup(run,gmail),stamp=profile?credential(profile):null,values=[id,key,profile?.id||null,stamp,digest('otp',id,key,otp),expires,resend,now];
   await run(dialectSql(`INSERT INTO password_reset_requests(id,email_key,profile_id,credential_hash,otp_hash,expires_at,resend_after,send_window_started_at) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE email_key=VALUES(email_key)`,`INSERT INTO password_reset_requests(id,email_key,profile_id,credential_hash,otp_hash,expires_at,resend_after,send_window_started_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(email_key) DO NOTHING`),values);
   const [pending]=await run('SELECT * FROM password_reset_requests WHERE email_key=? FOR UPDATE',[key]);
   if(pending.id!==id){
    if(new Date(pending.resend_after)>now)throw retry(new Date(pending.resend_after)-now);
    const windowStart=new Date(pending.send_window_started_at),sameWindow=now-windowStart<SEND_WINDOW;
    if(sameWindow&&Number(pending.send_count)>=MAX_SENDS)throw retry(windowStart.getTime()+SEND_WINDOW-now.getTime());
    await run(`UPDATE password_reset_requests SET id=?,profile_id=?,credential_hash=?,otp_hash=?,expires_at=?,resend_after=?,attempt_count=0,send_count=?,send_window_started_at=?,delivery_state='pending',consumed_at=NULL WHERE email_key=?`,[id,profile?.id||null,stamp,digest('otp',id,key,otp),expires,resend,sameWindow?Number(pending.send_count)+1:1,sameWindow?windowStart:now,key]);
   }
  });
  // A nonexistent, admin, deleted, or unverified address receives this same shape.
  return {challengeId:id,expiresIn:OTP_LIFETIME/1000,resendAfter:RESEND_DELAY/1000,message:'Nếu Gmail này liên kết với tài khoản đã xác minh, bạn sẽ nhận được mã xác thực.',delivery:{id,otp}};
 }
 async function deliver({id,otp}){
  try{
   const [request]=await query('SELECT * FROM password_reset_requests WHERE id=?',[id]);if(!request||request.consumed_at||request.delivery_state!=='pending'||new Date(request.expires_at)<=clock())return;
   const [profile]=await query('SELECT * FROM profiles WHERE id=?',[request.profile_id]);
   if(!eligible(profile)||!equal(request.credential_hash,credential(profile))){await query("UPDATE password_reset_requests SET delivery_state='failed' WHERE id=? AND delivery_state='pending'",[id]);return;}
   await sendOtp({email:profile.email,otp});
   await query("UPDATE password_reset_requests SET delivery_state='sent' WHERE id=? AND delivery_state='pending'",[id]);
  }catch{
   // A delivery problem never changes a credential or reveals the recipient.
   try{await query("UPDATE password_reset_requests SET delivery_state='failed' WHERE id=? AND delivery_state='pending'",[id]);}catch{}
   console.error(JSON.stringify({event:'password_reset_delivery_failed'}));
  }
 }
 async function verify({challengeId,otp}){
  ready();const token=randomBytes(32).toString('base64url'),sessionId=randomUUID();
  const result=await tx(async run=>{
   const [request]=await run('SELECT * FROM password_reset_requests WHERE id=? FOR UPDATE',[challengeId]),now=clock();
   if(!request||request.consumed_at||new Date(request.expires_at)<=now||Number(request.attempt_count)>=MAX_ATTEMPTS)return {error:invalidCode()};
   if(request.delivery_state!=='sent'||!equal(request.otp_hash,digest('otp',request.id,request.email_key,otp))){await run('UPDATE password_reset_requests SET attempt_count=attempt_count+1 WHERE id=?',[challengeId]);return {error:invalidCode()};}
   const [profile]=await run('SELECT * FROM profiles WHERE id=? FOR UPDATE',[request.profile_id]);
   const verifiedAt=clock();if(!eligible(profile)||!equal(request.credential_hash,credential(profile))||new Date(request.expires_at)<=verifiedAt)return {error:invalidCode()};
   await run('INSERT INTO password_reset_sessions(id,profile_id,token_hash,credential_hash,expires_at) VALUES (?,?,?,?,?)',[sessionId,profile.id,digest('token',sessionId,token),request.credential_hash,new Date(verifiedAt.getTime()+SESSION_LIFETIME)]);
   await run('UPDATE password_reset_requests SET consumed_at=? WHERE id=?',[verifiedAt,request.id]);
   return {resetId:sessionId,resetToken:token,expiresIn:SESSION_LIFETIME/1000};
  });
  if(result.error)throw result.error;return result;
 }
 async function complete({resetId,resetToken,newPassword}){
  ready();
  return tx(async run=>{
   const [session]=await run('SELECT * FROM password_reset_sessions WHERE id=? FOR UPDATE',[resetId]),now=clock();
   if(!session||session.consumed_at||new Date(session.expires_at)<=now||!equal(session.token_hash,digest('token',resetId,resetToken)))throw invalidSession();
   const [profile]=await run('SELECT * FROM profiles WHERE id=? FOR UPDATE',[session.profile_id]);
   if(!eligible(profile)||!equal(session.credential_hash,credential(profile))||new Date(session.expires_at)<=clock())throw invalidSession();
   const encoded=await hashPassword(newPassword);
   await run('UPDATE profiles SET password_hash=?,student_auth_version=student_auth_version+1 WHERE id=?',[encoded,profile.id]);
   await run('UPDATE password_reset_sessions SET consumed_at=? WHERE id=?',[now,session.id]);
   return {changed:true,username:profile.username,notification:{email:profile.email}};
  });
 }
 return {request,deliver,verify,complete};
}
