// Security integration checks use a disposable, locally generated MySQL schema.
// They never log in, send mail to, or change a real learner's account.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import env from '../src/config/env.js';
import {createPasswordResetService} from '../src/services/password-reset-core.js';
import {completePasswordResetSchema} from '../src/validators/auth.js';

const schema='ttnava_reset_test_'+process.pid+'_'+randomBytes(4).toString('hex');
let admin,pool,service,now,messages,failMail=false,enabled=true,person,other,adminId,deletedId,unverifiedId,initialPassword;
const query=async(sql,params=[])=>(await pool.query(sql,params))[0];
const tx=async fn=>{const connection=await pool.getConnection();try{await connection.beginTransaction();const result=await fn(connection);await connection.commit();return result;}catch(error){await connection.rollback();throw error;}finally{connection.release();}};
const rejected=(promise,code)=>assert.rejects(promise,error=>error.code===code);
const publicData=({delivery,...data})=>data;
const advance=ms=>{now=new Date(now.getTime()+ms);};
async function delivered(address='person@gmail.com'){const result=await service.request(address);await service.deliver(result.delivery);return result;}
async function verified(address='person@gmail.com'){const request=await delivered(address),session=await service.verify({challengeId:request.challengeId,otp:request.delivery.otp});return {request,session};}
const profile=async id=>(await query('SELECT * FROM profiles WHERE id=?',[id]))[0];

before(async()=>{
 assert.equal(env.db.driver,'mysql');assert(['127.0.0.1','localhost','::1'].includes(env.db.host));assert(/^ttnava_reset_test_[0-9]+_[a-f0-9]{8}$/u.test(schema));
 admin=await mysql.createConnection({host:env.db.host,port:env.db.port,user:env.db.user,password:env.db.password,charset:'utf8mb4',timezone:'Z'});
 await admin.query('CREATE DATABASE `'+schema+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 pool=mysql.createPool({host:env.db.host,port:env.db.port,user:env.db.user,password:env.db.password,database:schema,charset:'utf8mb4',timezone:'Z',connectionLimit:5});
 await query(`CREATE TABLE profiles (id CHAR(36) PRIMARY KEY,username VARCHAR(20) NOT NULL UNIQUE,email VARCHAR(120) NOT NULL UNIQUE,password_hash VARCHAR(100) NOT NULL,role VARCHAR(16) NOT NULL,account_kind VARCHAR(16) NOT NULL DEFAULT 'student',email_verified_at DATETIME(3) NULL,gmail_identity VARCHAR(120) NULL,deleted_at DATETIME(3) NULL,banned_until DATETIME(3) NULL,student_auth_version INT NOT NULL DEFAULT 0,display_name VARCHAR(60) NOT NULL,grade INT NULL)`);
 await query('CREATE TABLE learning_fixture (profile_id CHAR(36) PRIMARY KEY,course VARCHAR(40),score INT,diamonds INT)');
 const sql=await fs.readFile(new URL('../sql/migrations/047_password_reset.sql',import.meta.url),'utf8');for(const statement of sql.split(/;\s*(?:\r?\n|$)/u).map(s=>s.trim()).filter(Boolean))await query(statement);
 initialPassword=await bcrypt.hash('Previous123!',4);
});
after(async()=>{
 await pool?.end();if(admin){assert(/^ttnava_reset_test_[0-9]+_[a-f0-9]{8}$/u.test(schema));await admin.query('DROP DATABASE IF EXISTS `'+schema+'`');await admin.end();}
});
beforeEach(async()=>{
 await query('DELETE FROM password_reset_sessions');await query('DELETE FROM password_reset_requests');await query('DELETE FROM learning_fixture');await query('DELETE FROM profiles');
 now=new Date('2026-11-21T10:00:00.000Z');messages=[];failMail=false;enabled=true;
 [person,other,adminId,deletedId,unverifiedId]=Array.from({length:5},()=>randomUUID());
 for(const [id,name,role,verified,deleted]of [[person,'person','student',true,false],[other,'other','student',true,false],[adminId,'administrator','admin',true,false],[deletedId,'deleted','student',true,true],[unverifiedId,'unverified','student',false,false]]){
  await query('INSERT INTO profiles(id,username,email,password_hash,role,email_verified_at,gmail_identity,deleted_at,display_name,grade) VALUES (?,?,?,?,?,?,?,?,?,?)',[id,name,name+'@gmail.com',initialPassword,role,verified?now:null,name+'@gmail.com',deleted?now:null,'Learner '+name,role==='student'?10:null]);
 }
 await query('INSERT INTO learning_fixture(profile_id,course,score,diamonds) VALUES (?,?,?,?)',[person,'hsk-1',95,36]);
 service=createPasswordResetService({query,withTransaction:tx,dialectSql:(a)=>a,secret:randomBytes(32).toString('hex'),hashPassword:value=>bcrypt.hash(value,4),available:()=>enabled,clock:()=>new Date(now),sendOtp:async message=>{if(failMail)throw Error('mock delivery error');messages.push(message);}});
});

test('request and correct code do not change a profile; only a verified completion changes credentials',async()=>{
 const before=await profile(person),protectedBefore=await profile(other),learning=await query('SELECT * FROM learning_fixture');
 const request=await delivered();assert.equal(messages.length,1);assert.equal(messages[0].email,'person@gmail.com');assert.match(messages[0].otp,/^\d{6}$/u);
 const stored=(await query('SELECT * FROM password_reset_requests WHERE id=?',[request.challengeId]))[0];assert.notEqual(stored.otp_hash,request.delivery.otp);assert.equal(stored.otp_hash.length,64);assert(!JSON.stringify(publicData(request)).includes(request.delivery.otp));
 assert.deepEqual(await profile(person),before);
 const session=await service.verify({challengeId:request.challengeId,otp:request.delivery.otp});assert.match(session.resetToken,/^[A-Za-z0-9_-]{43}$/u);assert.deepEqual(await profile(person),before);
 await service.complete({...session,newPassword:'Replacement123!'});const changed=await profile(person);
 assert(await bcrypt.compare('Replacement123!',changed.password_hash));assert(!await bcrypt.compare('Previous123!',changed.password_hash));assert.equal(changed.student_auth_version,1);
 const {password_hash,student_auth_version,...rest}=changed;const {password_hash:old,student_auth_version:oldVersion,...previous}=before;assert.deepEqual(rest,previous);
 assert.deepEqual(await profile(other),protectedBefore);assert.deepEqual(await query('SELECT * FROM learning_fixture'),learning);
});
test('unknown, administrator, deleted, and unverified addresses cannot receive a recovery grant',async()=>{
 const original=publicData(await service.request('nobody@gmail.com'));
 for(const address of ['ghost@gmail.com','administrator@gmail.com','deleted@gmail.com','unverified@gmail.com']){
  const request=await delivered(address);assert.deepEqual(Object.keys(publicData(request)).sort(),Object.keys(original).sort());assert.equal(request.message,original.message);
  await rejected(service.verify({challengeId:request.challengeId,otp:request.delivery.otp}),'INVALID_RESET_OTP');
 }
 assert.equal(messages.length,0);assert.equal((await query('SELECT * FROM password_reset_sessions')).length,0);
});
test('wrong-attempt counts commit, and the fifth failure exhausts only the code',async()=>{
 const before=await profile(person),request=await delivered(),wrong=request.delivery.otp==='000000'?'000001':'000000';
 for(let count=1;count<=5;count++){await rejected(service.verify({challengeId:request.challengeId,otp:wrong}),'INVALID_RESET_OTP');assert.equal(Number((await query('SELECT attempt_count FROM password_reset_requests WHERE id=?',[request.challengeId]))[0].attempt_count),count);}
 await rejected(service.verify({challengeId:request.challengeId,otp:request.delivery.otp}),'INVALID_RESET_OTP');assert.deepEqual(await profile(person),before);
});
test('an expired correct code does not issue a session',async()=>{
 const request=await delivered();advance(300_001);await rejected(service.verify({challengeId:request.challengeId,otp:request.delivery.otp}),'INVALID_RESET_OTP');assert.equal((await query('SELECT * FROM password_reset_sessions')).length,0);
});
test('Gmail aliases share the resend cooldown and resending invalidates the old code',async()=>{
 const first=await delivered();await rejected(service.request('p.e.r.s.o.n+school@gmail.com'),'RESET_RATE_LIMITED');advance(60_001);
 const second=await delivered('p.e.r.s.o.n+school@gmail.com');assert.equal(messages.at(-1).email,'person@gmail.com');assert.notEqual(first.challengeId,second.challengeId);
 await rejected(service.verify({challengeId:first.challengeId,otp:first.delivery.otp}),'INVALID_RESET_OTP');await service.verify({challengeId:second.challengeId,otp:second.delivery.otp});
});
test('email send quota persists across new challenges and expires after an hour',async()=>{
 await delivered();for(let i=0;i<4;i++){advance(60_001);await delivered();}advance(60_001);await rejected(service.request('person@gmail.com'),'RESET_RATE_LIMITED');assert.equal(messages.length,5);advance(3_600_001);await delivered();assert.equal(messages.length,6);
});
test('neither a consumed OTP nor a completed recovery grant can be replayed',async()=>{
 const {request,session}=await verified();await rejected(service.verify({challengeId:request.challengeId,otp:request.delivery.otp}),'INVALID_RESET_OTP');
 await service.complete({...session,newPassword:'Replacement123!'});await rejected(service.complete({...session,newPassword:'SecondAttempt123!'}),'INVALID_RESET_SESSION');assert.equal((await profile(person)).student_auth_version,1);
});
test('a fabricated or mismatched grant never changes either account',async()=>{
 const before=await profile(person),protectedBefore=await profile(other),a=await verified(),b=await verified('other@gmail.com');
 await rejected(service.complete({resetId:randomUUID(),resetToken:randomBytes(32).toString('base64url'),newPassword:'WrongGrant123!'}),'INVALID_RESET_SESSION');
 await rejected(service.complete({resetId:a.session.resetId,resetToken:b.session.resetToken,newPassword:'WrongGrant123!'}),'INVALID_RESET_SESSION');
 assert.deepEqual(await profile(person),before);assert.deepEqual(await profile(other),protectedBefore);
});
test('a verified grant expires after five minutes',async()=>{
 const {session}=await verified(),before=await profile(person);advance(300_001);await rejected(service.complete({...session,newPassword:'Replacement123!'}),'INVALID_RESET_SESSION');assert.deepEqual(await profile(person),before);
});
test('an anonymous resend cannot invalidate a previously verified grant',async()=>{
 const {session}=await verified();advance(60_001);const newRequest=await delivered();await service.complete({...session,newPassword:'Replacement123!'});
 await rejected(service.verify({challengeId:newRequest.challengeId,otp:newRequest.delivery.otp}),'INVALID_RESET_OTP');
});
test('parallel OTP verification and completion each succeed exactly once',async()=>{
 const request=await delivered(),outcomes=await Promise.allSettled([1,2].map(()=>service.verify({challengeId:request.challengeId,otp:request.delivery.otp})));
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);const session=outcomes.find(x=>x.status==='fulfilled').value;
 const completions=await Promise.allSettled([1,2].map(()=>service.complete({...session,newPassword:'Replacement123!'})));assert.equal(completions.filter(x=>x.status==='fulfilled').length,1);assert.equal((await profile(person)).student_auth_version,1);
});
test('two grants for one account cannot both change its password',async()=>{
 const first=await verified();advance(60_001);const second=await verified();const outcomes=await Promise.allSettled([first.session,second.session].map(session=>service.complete({...session,newPassword:'Replacement123!'})));
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal((await profile(person)).student_auth_version,1);
});
test('a credential change or account deletion invalidates pending recovery',async()=>{
 const request=await delivered();await query('UPDATE profiles SET password_hash=? WHERE id=?',[await bcrypt.hash('ChangedElsewhere123!',4),person]);await rejected(service.verify({challengeId:request.challengeId,otp:request.delivery.otp}),'INVALID_RESET_OTP');
 advance(60_001);const {session}=await verified();await query('UPDATE profiles SET deleted_at=? WHERE id=?',[now,person]);await rejected(service.complete({...session,newPassword:'Replacement123!'}),'INVALID_RESET_SESSION');
});
test('recovery never removes an existing account restriction',async()=>{
 const restriction=new Date('2099-01-01T00:00:00Z');await query('UPDATE profiles SET banned_until=? WHERE id=?',[restriction,person]);const {session}=await verified();await service.complete({...session,newPassword:'Replacement123!'});assert.equal(new Date((await profile(person)).banned_until).toISOString(),restriction.toISOString());
});
test('failed email delivery does not allow use of the code or change the account',async()=>{
 failMail=true;const before=await profile(person),request=await delivered();await rejected(service.verify({challengeId:request.challengeId,otp:request.delivery.otp}),'INVALID_RESET_OTP');assert.deepEqual(await profile(person),before);
});
test('reset validation rejects oversized bcrypt inputs before any profile update',()=>{
 assert.throws(()=>completePasswordResetSchema.parse({resetId:randomUUID(),resetToken:randomBytes(32).toString('base64url'),newPassword:'密'.repeat(30)}));
});
