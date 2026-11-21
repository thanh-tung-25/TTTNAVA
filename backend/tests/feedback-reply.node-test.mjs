import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';
import {createFeedbackUpdater,feedbackVersion} from '../src/services/feedback-reply.js';

const schema='ttnava_feedback_test_'+process.pid+'_'+randomBytes(4).toString('hex');
let admin,pool,update,id,learner,other;
const staff={role:'admin',admin_scope:'super'},query=async(sql,params=[])=>(await pool.query(sql,params))[0];
const tx=async callback=>{const connection=await pool.getConnection();try{await connection.beginTransaction();const value=await callback(connection);await connection.commit();return value;}catch(error){await connection.rollback();throw error;}finally{connection.release();}};
const row=async()=>(await query('SELECT * FROM learning_feedback WHERE id=?',[id]))[0];
before(async()=>{
 assert.equal(env.db.driver,'mysql');assert(['localhost','127.0.0.1','::1'].includes(env.db.host));assert(/^ttnava_feedback_test_\d+_[a-f0-9]+$/u.test(schema));
 const options={host:env.db.host,port:env.db.port,user:env.db.user,password:env.db.password,timezone:'Z'};admin=await mysql.createConnection(options);await admin.query('CREATE DATABASE `'+schema+'` CHARACTER SET utf8mb4');pool=mysql.createPool({...options,database:schema,connectionLimit:4});
 await query('CREATE TABLE profiles(id CHAR(36) PRIMARY KEY,role VARCHAR(20),registration_source VARCHAR(30),student_management_scope VARCHAR(30),student_creator_scope VARCHAR(30)) ENGINE=InnoDB');
 await query('CREATE TABLE learning_feedback(id CHAR(36) PRIMARY KEY,reporter_id CHAR(36),scope VARCHAR(20),category VARCHAR(30),message TEXT,page_url TEXT,context_text TEXT,status VARCHAR(20),reply TEXT,created_at DATETIME(3),updated_at DATETIME(3)) ENGINE=InnoDB');
 await query('CREATE TABLE learning_fixture(profile_id CHAR(36),score INT,diamonds INT) ENGINE=InnoDB');update=createFeedbackUpdater({withTransaction:tx});
});
after(async()=>{await pool?.end();if(admin){assert(/^ttnava_feedback_test_\d+_[a-f0-9]+$/u.test(schema));await admin.query('DROP DATABASE `'+schema+'`');await admin.end();}});
beforeEach(async()=>{
 await query('DELETE FROM learning_feedback');await query('DELETE FROM profiles');await query('DELETE FROM learning_fixture');id=randomUUID();learner=randomUUID();other=randomUUID();
 await query("INSERT INTO profiles VALUES (?,'student','self',NULL,NULL),(?,'student','staff','primary','primary')",[learner,other]);await query('INSERT INTO learning_fixture VALUES (?,95,36)',[learner]);
 await query("INSERT INTO learning_feedback VALUES (?,?,'chinese','question','Fixture question','/pages/student/chinese/','Original exercise context','open','',?,?)",[id,learner,new Date(Date.now()-60000),new Date(Date.now()-60000)]);
});
test('save returns the committed reply, status, time and version visible to its reporter',async()=>{
 const before=await row(),history=await query('SELECT * FROM learning_fixture'),profiles=await query('SELECT * FROM profiles');
 const receipt=await update(staff,id,{status:'resolved',reply:'  Cô đã sửa lỗi. Em tải lại bài nhé.  ',expected_version:feedbackVersion(before)}),saved=await row();
 assert.equal(receipt.reply,'Cô đã sửa lỗi. Em tải lại bài nhé.');assert.equal(receipt.status,'resolved');assert.equal(receipt.reply_version,feedbackVersion(saved));assert.deepEqual(receipt.updated_at,saved.updated_at);
 const {status:a,reply:b,updated_at:c,...protectedBefore}=before,{status:d,reply:e,updated_at:f,...protectedAfter}=saved;assert.deepEqual(protectedAfter,protectedBefore);assert.deepEqual(await query('SELECT * FROM learning_fixture'),history);assert.deepEqual(await query('SELECT * FROM profiles'),profiles);
 assert.equal((await query('SELECT reply FROM learning_feedback WHERE reporter_id=?',[learner]))[0].reply,receipt.reply);assert.deepEqual(await query('SELECT reply FROM learning_feedback WHERE reporter_id=?',[other]),[]);
});
test('identical retries confirm the previous save without issuing another update',async()=>{
 const body={status:'reviewing',reply:'Cô đã nhận được phản ánh.',expected_version:feedbackVersion(await row())},first=await update(staff,id,body),before=await row();
 assert.deepEqual(await update(staff,id,body),first);assert.deepEqual(await row(),before);
});
test('a stale administrator cannot overwrite a newer response',async()=>{
 const version=feedbackVersion(await row());await update(staff,id,{status:'resolved',reply:'New reply',expected_version:version});const saved=await row();
 await assert.rejects(update(staff,id,{status:'reviewing',reply:'Stale reply',expected_version:version}),error=>error.code==='FEEDBACK_CONFLICT');assert.deepEqual(await row(),saved);
});
test('concurrent edits preserve one committed response and reject the stale edit',async()=>{
 const version=feedbackVersion(await row()),results=await Promise.allSettled(['First','Second'].map(reply=>update(staff,id,{status:'reviewing',reply,expected_version:version})));
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.find(result=>result.status==='rejected').reason.code,'FEEDBACK_CONFLICT');
});
test('student, wrong-scope admin, and hidden student cannot update the response',async()=>{
 const body={status:'resolved',reply:'Unauthorized'},before=await row();
 await assert.rejects(update({role:'student'},id,body),error=>error.code==='FORBIDDEN');await assert.rejects(update({role:'admin',admin_scope:'primary'},id,body),error=>error.code==='FORBIDDEN');assert.deepEqual(await row(),before);
 await query('UPDATE learning_feedback SET reporter_id=? WHERE id=?',[other,id]);const hidden=await row();await assert.rejects(update({role:'admin',admin_scope:'chinese'},id,body),error=>error.code==='NOT_FOUND');assert.deepEqual(await row(),hidden);
});
test('invalid data leaves the saved report unchanged and scoped staff can reply within their scope',async()=>{
 const before=await row();for(const patch of [{status:'wrong',reply:'x'},{status:'resolved',reply:'x'.repeat(2001)},{status:'resolved',reply:'x',expected_version:'fake'}])await assert.rejects(update(staff,id,patch));assert.deepEqual(await row(),before);
 assert.equal((await update({role:'admin',admin_scope:'chinese'},id,{status:'reviewing',reply:'Scoped reply'})).reply,'Scoped reply');
});
