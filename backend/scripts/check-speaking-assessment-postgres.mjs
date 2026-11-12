// Verify the production dialect with fake provider responses. Every fixture,
// including creation of the new tables when absent, is rolled back atomically.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
process.loadEnvFile(new URL('../.env.vercel',import.meta.url));
assert.equal(process.env.DB_DRIVER,'postgres');assert.equal(process.env.PGSCHEMA,'ttnava_stage');
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
const {query,withTransaction,closePool}=await import('../src/config/db.js');
const env=(await import('../src/config/env.js')).default;
const {createTestUser}=await import('../tests/helpers/index.js');
const {saveLesson,saveSet,detail}=await import('../src/services/chinese.js');
const {createSet}=await import('../src/services/chinese-manage.js');
const {createSpeakingSubmission,assessSpeakingClip,finishSpeakingSubmission,speakingSubmission,speakingResults}=await import('../src/services/chinese-speaking-assessment.js');
const {encodeSpeakingWav}=await import('../../frontend/assets/js/chinese-speaking-audio.js');
const originalConfig=env.speakingAi,originalFetch=globalThis.fetch,rollback=Symbol('rollback');
let lessonId,setId,studentId,submissionId,calls=0;
try{
 env.speakingAi={enabled:true,key:'rollback-fixture-key',zeroRetentionConfirmed:true,dailyLimit:5};
 globalThis.fetch=async(url,options)=>{
  calls++;
  if(String(url)==='https://api.groq.com/openai/v1/audio/transcriptions')return Response.json({text:'我叫小明。',segments:[]});
  assert.equal(String(url),'https://api.groq.com/openai/v1/chat/completions');
  const input=JSON.parse(JSON.parse(options.body).messages[1].content);
  return Response.json({choices:[{message:{content:JSON.stringify({answers:input.answers.map(a=>({index:a.index,content:100,grammar:100,feedback:'Trả lời phù hợp.',correction:'',correction_pinyin:'',errors:[]}))})}}]});
 };
 try{await withTransaction(async()=>{
  await query(await readFile(new URL('../sql/postgres/034_chinese_speaking_assessment.sql',import.meta.url),'utf8'));
  const student=await createTestUser({grade:null});studentId=student.id;const user={id:student.id,role:'student'};
  lessonId=(await saveLesson(null,{level_id:1,title:'Speaking rollback verification',position:99998,status:'published'})).id;
  setId=(await createSet({lesson_id:lessonId,title:'Speaking rollback verification'})).id;
  await saveSet(setId,{title:'Speaking rollback verification',status:'published',speaking_settings:{duration_seconds:90,order:'sequential',ai_assessment:true},items:[{kind:'dialogue',data:{practice:'speaking',speaking_selected:true,text:'你叫什么名字？',meaning:'Teacher only',answer_reference:'我叫安。',assessment_notes:'Chấp nhận tên khác.'}}]});
  const publicData=await detail(setId,false,student.id);assert.equal(publicData.items.length,1);assert.equal(publicData.items[0].data.answer_reference,undefined);
  const recordingId=randomUUID(),input={recording_id:recordingId,recorded_at:new Date().toISOString(),questions:['你叫什么名字？']};
  submissionId=(await createSpeakingSubmission(user,setId,input)).id;
  assert.equal((await createSpeakingSubmission(user,setId,input)).id,submissionId);
  const audio=Buffer.from(encodeSpeakingWav(new Float32Array(4000).fill(.2)));
  try{await assessSpeakingClip(user,submissionId,1,1,audio);await assessSpeakingClip(user,submissionId,1,1,audio);}finally{audio.fill(0);}
  const result=await finishSpeakingSubmission(user,submissionId);assert.equal(result.status,'completed');assert.equal(Number(result.score),100);
  assert.deepEqual(result.result.weights,{content:60,grammar:40,pronunciation:0,fluency:0});
  assert.equal((await speakingSubmission(user,submissionId)).result.questions[0].transcript,'我叫小明。');
  assert((await speakingResults()).some(row=>row.id===submissionId));
  await finishSpeakingSubmission(user,submissionId);assert.equal(calls,2);
  throw rollback;
 });}catch(error){if(error!==rollback)throw error;}
 assert.equal((await query('SELECT id FROM profiles WHERE id=?',[studentId])).length,0);
 assert.equal((await query('SELECT id FROM chinese_lessons WHERE id=?',[lessonId])).length,0);
 assert.equal((await query('SELECT id FROM chinese_sets WHERE id=?',[setId])).length,0);
 console.log(JSON.stringify({ready:true,postgresAssessment:true,privateReferencesHidden:true,idempotent:true,adminResultVisible:true,externalAiCalls:0,fixturesRolledBack:true}));
}catch(error){console.error(JSON.stringify({ready:false,code:error.code||'ASSESSMENT_CHECK_FAILED',message:error.name==='AssertionError'?error.message:'PostgreSQL speaking check failed; no credentials printed.'}));process.exitCode=1;}
finally{env.speakingAi=originalConfig;globalThis.fetch=originalFetch;await closePool();}
