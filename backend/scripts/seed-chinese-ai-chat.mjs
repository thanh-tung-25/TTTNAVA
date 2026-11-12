// Seed missing defaults in local XAMPP; never overwrite a teacher's settings.
import assert from 'node:assert/strict';
import env from '../src/config/env.js';
import {withTransaction,closePool} from '../src/config/db.js';
import {defaultChatSettings} from '../../frontend/assets/js/chinese-ai-chat-data.js';
assert.equal(env.db.driver,'mysql');assert(['localhost','127.0.0.1','::1'].includes(env.db.host));assert.equal(env.db.database,'kids_learning');
try{
 const result=await withTransaction(async c=>{
  const run=async(sql,p=[]) =>(await c.query(sql,p))[0],lessons=await run("SELECT * FROM chinese_lessons WHERE level_id=1 AND status='published' ORDER BY position FOR UPDATE");let inserted=0,preserved=0;
  for(const lesson of lessons){if(lesson.position<1||lesson.position>10)continue;const [old]=await run('SELECT lesson_id FROM chinese_ai_chat_settings WHERE lesson_id=? FOR UPDATE',[lesson.id]);if(old){preserved++;continue;}await run('INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES (?,?)',[lesson.id,JSON.stringify(defaultChatSettings(lesson))]);inserted++;}
  return {inserted,preserved};
 });console.log(JSON.stringify({database:env.db.database,...result}));
}finally{await closePool();}
