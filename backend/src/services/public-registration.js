import {createHmac,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import env from '../config/env.js';
import {dialectSql,withTransaction} from '../config/db.js';
import {AppError} from '../utils/errors.js';
import {normalizeGmail} from '../utils/gmail.js';
import {hashPassword} from './auth-service.js';
import {registrationAvailable,sendRegistrationOtp} from './registration-mail.js';
import {publicProfile} from '../utils/serializers.js';
import {signToken} from '../utils/jwt.js';

const OTP_LIFETIME=300_000,RESEND_DELAY=60_000,SEND_WINDOW=3_600_000,MAX_SENDS=5,MAX_ATTEMPTS=5;
const unavailable=()=>new AppError(503,'REGISTRATION_UNAVAILABLE','Đăng ký đang tạm dừng. Bạn vui lòng thử lại sau.');
const invalidOtp=()=>new AppError(400,'INVALID_REGISTRATION_OTP','Mã xác minh không đúng hoặc đã hết hạn. Bạn có thể yêu cầu gửi mã mới.');
const duplicateEmail=()=>new AppError(409,'EMAIL_ALREADY_REGISTERED','Gmail này đã có tài khoản. Bạn hãy đăng nhập bằng tài khoản đã có.');
function limitError(milliseconds){
 return new AppError(429,'REGISTRATION_RATE_LIMITED','Bạn đã yêu cầu mã quá nhanh. Vui lòng chờ rồi thử lại.',{retryAfterSeconds:Math.max(1,Math.ceil(milliseconds/1000))});
}
function otpDigest(id,identity,otp){
 return createHmac('sha256',env.jwt.secret).update(`${id}:${identity}:${otp}`).digest('hex');
}
async function emailIsRegistered(run,{email,identity}){
 // Include older real Gmail addresses even before they have a canonical identity.
 const legacyIdentity=dialectSql(
  "CONCAT(REPLACE(SUBSTRING_INDEX(SUBSTRING_INDEX(LOWER(email),'@',1),'+',1),'.',''),'@gmail.com')",
  "replace(split_part(split_part(lower(email),'@',1),'+',1),'.','') || '@gmail.com'",
 );
 const rows=await run(`SELECT id FROM profiles WHERE gmail_identity=? OR LOWER(email)=?
  OR (LOWER(email) LIKE '%@gmail.com' AND ${legacyIdentity}=?) LIMIT 1`,[identity,email,identity]);
 return rows.length>0;
}

export async function requestRegistrationOtp(rawEmail){
 if(!registrationAvailable())throw unavailable();
 const gmail=normalizeGmail(rawEmail),id=randomUUID(),otp=String(randomInt(0,1_000_000)).padStart(6,'0');
 const now=new Date(),expiresAt=new Date(now.getTime()+OTP_LIFETIME),resendAfter=new Date(now.getTime()+RESEND_DELAY);
 await withTransaction(async connection=>{
  const run=async(sql,params=[])=>(await connection.query(sql,params))[0];
  if(await emailIsRegistered(run,gmail))throw duplicateEmail();
  const values=[id,gmail.email,gmail.identity,otpDigest(id,gmail.identity,otp),expiresAt,resendAfter,now];
  await run(dialectSql(
   `INSERT INTO registration_otps(id,email,gmail_identity,otp_hash,expires_at,resend_after,send_count,send_window_started_at)
    VALUES (?,?,?,?,?,?,1,?) ON DUPLICATE KEY UPDATE gmail_identity=VALUES(gmail_identity)`,
   `INSERT INTO registration_otps(id,email,gmail_identity,otp_hash,expires_at,resend_after,send_count,send_window_started_at)
    VALUES (?,?,?,?,?,?,1,?) ON CONFLICT(gmail_identity) DO NOTHING`,
  ),values);
  const [pending]=await run('SELECT * FROM registration_otps WHERE gmail_identity=? FOR UPDATE',[gmail.identity]);
  if(pending.id!==id){
   const retryAt=new Date(pending.resend_after).getTime();
   if(retryAt>now.getTime())throw limitError(retryAt-now.getTime());
   const windowStart=new Date(pending.send_window_started_at).getTime(),sameWindow=now.getTime()-windowStart<SEND_WINDOW;
   if(sameWindow&&Number(pending.send_count)>=MAX_SENDS)throw limitError(windowStart+SEND_WINDOW-now.getTime());
   await run(`UPDATE registration_otps SET id=?,email=?,otp_hash=?,expires_at=?,resend_after=?,attempt_count=0,
    consumed_at=NULL,send_count=?,send_window_started_at=? WHERE gmail_identity=?`,
    [id,gmail.email,otpDigest(id,gmail.identity,otp),expiresAt,resendAfter,sameWindow?Number(pending.send_count)+1:1,sameWindow?pending.send_window_started_at:now,gmail.identity]);
  }
  // Await delivery acceptance before committing a usable challenge. Failed sends roll back.
  await sendRegistrationOtp({email:gmail.email,otp});
 });
 return {challengeId:id,expiresIn:OTP_LIFETIME/1000,resendAfter:RESEND_DELAY/1000};
}

export async function completeRegistration({challengeId,otp,username,password,displayName,grade=null,avatarKey='meo'}){
 if(!registrationAvailable())throw unavailable();
 const result=await withTransaction(async connection=>{
  const run=async(sql,params=[])=>(await connection.query(sql,params))[0];
  const [pending]=await run('SELECT * FROM registration_otps WHERE id=? FOR UPDATE',[challengeId]);
  const now=new Date();
  if(!pending||pending.consumed_at||new Date(pending.expires_at)<=now)return {error:invalidOtp()};
  if(Number(pending.attempt_count)>=MAX_ATTEMPTS)return {error:invalidOtp()};
  const expected=Buffer.from(pending.otp_hash,'hex'),actual=Buffer.from(otpDigest(pending.id,pending.gmail_identity,otp),'hex');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual)){
   // Return instead of throwing here so the failed-attempt counter is committed.
   await run('UPDATE registration_otps SET attempt_count=attempt_count+1 WHERE id=?',[challengeId]);
   return {error:invalidOtp()};
  }
  if(await emailIsRegistered(run,{email:pending.email,identity:pending.gmail_identity}))return {error:duplicateEmail()};
  const used=await run('SELECT id FROM profiles WHERE LOWER(username)=LOWER(?) LIMIT 1',[username]);
  if(used.length)return {error:new AppError(409,'USERNAME_TAKEN','Tên đăng nhập đã được sử dụng. Bạn hãy chọn tên khác.')};
  const id=randomUUID(),passwordHash=await hashPassword(password);
  await run(`INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade,
   registration_source,email_verified_at,gmail_identity,student_created_by,student_creator_scope,student_management_scope)
   VALUES (?,?,?,?,'student',?,?,?,'self',?,?,NULL,NULL,NULL)`,
   [id,username,pending.email,passwordHash,displayName,avatarKey,grade,now,pending.gmail_identity]);
  await run('UPDATE registration_otps SET consumed_at=? WHERE id=?',[now,challengeId]);
  const [profile]=await run('SELECT * FROM profiles WHERE id=?',[id]);
  return {profile};
 });
 if(result.error)throw result.error;
 return {profile:publicProfile(result.profile),token:signToken(result.profile)};
}
