// Only this randomly generated local schema is created/removed. No application
// tables, learner accounts, reward balances, or real attempts are used.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';
import {AppError} from '../src/utils/errors.js';
import {createStudyProgressSaver} from '../src/services/study-progress.js';

const schema='ttnava_progress_test_'+process.pid+'_'+randomBytes(4).toString('hex');
let admin,pool,service,owner,other,id,now;
const query=async(sql,params=[])=>(await pool.query(sql,params))[0];
const tx=async callback=>{const connection=await pool.getConnection();try{await connection.beginTransaction();const value=await callback(connection);await connection.commit();return value;}catch(error){await connection.rollback();throw error;}finally{connection.release();}};
const row=async()=>(await query('SELECT * FROM study_activity_sessions WHERE id=?',[id]))[0];
const result=async()=>JSON.parse((await row()).result);
before(async()=>{
 assert.equal(env.db.driver,'mysql');assert(['localhost','127.0.0.1','::1'].includes(env.db.host));assert(/^ttnava_progress_test_\d+_[a-f0-9]+$/u.test(schema));
 const options={host:env.db.host,port:env.db.port,user:env.db.user,password:env.db.password,timezone:'Z'};
 admin=await mysql.createConnection(options);await admin.query('CREATE DATABASE `'+schema+'` CHARACTER SET utf8mb4');pool=mysql.createPool({...options,database:schema,connectionLimit:4});
 await query('CREATE TABLE study_activity_sessions (id CHAR(36) PRIMARY KEY,profile_id CHAR(36),course_id VARCHAR(32),activity VARCHAR(30),source_id VARCHAR(80),unit_key VARCHAR(30),snapshot JSON,result JSON,created_at DATETIME(3),completed_at DATETIME(3)) ENGINE=InnoDB');
 await query('CREATE TABLE access_fixture (profile_id CHAR(36),enabled BOOLEAN) ENGINE=InnoDB');
 await query('CREATE TABLE learning_fixture (profile_id CHAR(36),score INT,diamonds INT) ENGINE=InnoDB');
 service=createStudyProgressSaver({withTransaction:tx,clock:()=>now,requireCourse:async(user,course,run)=>{assert.equal(course,'hsk-1');const [access]=await run('SELECT enabled FROM access_fixture WHERE profile_id=?',[user]);if(!access?.enabled)throw new AppError(403,'COURSE_LOCKED','Fixture access denied');}});
});
after(async()=>{await pool?.end();if(admin){assert(/^ttnava_progress_test_\d+_[a-f0-9]+$/u.test(schema));await admin.query('DROP DATABASE `'+schema+'`');await admin.end();}});
beforeEach(async()=>{
 await query('DELETE FROM study_activity_sessions');await query('DELETE FROM access_fixture');await query('DELETE FROM learning_fixture');owner=randomUUID();other=randomUUID();id=randomUUID();now=Date.now();
 await query('INSERT INTO access_fixture VALUES (?,true),(?,true)',[owner,other]);await query('INSERT INTO learning_fixture VALUES (?,95,36)',[owner]);
 await query('INSERT INTO study_activity_sessions VALUES (?,?,?,?,?,?,?,?,?,NULL)',[id,owner,'hsk-1','words','set','all',JSON.stringify({kind:'view',required:5,items:Array.from({length:12},(_,n)=>({id:String(n)}))}),'{}',new Date(now-10000)]);
});
test('partial study persists before a reward without changing scores, diamonds, or completion',async()=>{
 const previous=await row(),learning=await query('SELECT * FROM learning_fixture');await service(owner,id,{items:[{id:'0'}]});const after=await row();
 assert.deepEqual(await result(),{studied_items:['0']});const {result:oldResult,...beforeFields}=previous,{result:newResult,...afterFields}=after;assert.deepEqual(afterFields,beforeFields);assert.deepEqual(await query('SELECT * FROM learning_fixture'),learning);
});
test('learning beyond the five-item reward retains receipt, score, and the original completion time',async()=>{
 const receipt={completed:5,correct:4,reward:{earned:1,reason:'earned'},studied_items:['0','1','2','3','4']};await query('UPDATE study_activity_sessions SET result=?,completed_at=? WHERE id=?',[JSON.stringify(receipt),new Date(now-5000),id]);
 const before=await row();await service(owner,id,{items:[{id:'5'},{id:'6'}]});const saved=await result();assert.equal(saved.studied_items.length,7);assert.deepEqual(saved.reward,receipt.reward);assert.equal(saved.completed,5);assert.equal(saved.correct,4);assert.deepEqual((await row()).completed_at,before.completed_at);
});
test('the daily reward cap does not prevent additional coverage',async()=>{
 await query('UPDATE study_activity_sessions SET result=?,completed_at=? WHERE id=?',[JSON.stringify({completed:5,reward:{earned:0,reason:'daily_limit'},studied_items:['0','1','2','3','4']}),new Date(now-5000),id]);
 await service(owner,id,{items:[{id:'10'}]});assert((await result()).studied_items.includes('10'));assert.deepEqual((await result()).reward,{earned:0,reason:'daily_limit'});
});
test('old receipt counts survive adding new per-item coverage',async()=>{
 const old={completed:5,correct:3,reward:{earned:1}};await query('UPDATE study_activity_sessions SET result=?,completed_at=? WHERE id=?',[JSON.stringify(old),new Date(now-5000),id]);
 await service(owner,id,{items:[{id:'8'}]});await service(owner,id,{items:[{id:'9'}]});assert.deepEqual(await result(),{...old,legacy_completed:5,studied_items:['8','9']});
});
test('concurrent device updates union item IDs under the session lock',async()=>{
 await Promise.all([service(owner,id,{items:[{id:'0'},{id:'1'}]}),service(owner,id,{items:[{id:'1'},{id:'2'}]}),service(owner,id,{items:[{id:'3'}]})]);assert.deepEqual(new Set((await result()).studied_items),new Set(['0','1','2','3']));
});
test('another learner cannot access or alter the session',async()=>{
 const before=await row();await assert.rejects(service(other,id,{items:[{id:'0'}]}),error=>error.code==='NOT_FOUND');assert.deepEqual(await row(),before);
});
test('invalid items, revoked access, and expired sessions leave stored data unchanged',async()=>{
 const before=await row();await assert.rejects(service(owner,id,{items:[{id:'foreign'}]}));assert.deepEqual(await row(),before);
 await query('UPDATE access_fixture SET enabled=false WHERE profile_id=?',[owner]);await assert.rejects(service(owner,id,{items:[{id:'0'}]}),error=>error.code==='COURSE_LOCKED');assert.deepEqual(await row(),before);
 await query('UPDATE access_fixture SET enabled=true WHERE profile_id=?',[owner]);now+=86400001;await assert.rejects(service(owner,id,{items:[{id:'0'}]}),error=>error.code==='STUDY_SESSION_EXPIRED');assert.deepEqual(await row(),before);
});
