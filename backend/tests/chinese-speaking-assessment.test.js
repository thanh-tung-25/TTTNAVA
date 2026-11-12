import {beforeAll,afterAll,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import env from '../src/config/env.js';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent,app} from './helpers/index.js';
import {encodeSpeakingWav,answerSampleRanges} from '../../frontend/assets/js/chinese-speaking-audio.js';
import {validateSpeakingWav} from '../src/services/chinese-speaking-provider.js';
import {parseSpeakingText} from '../src/services/chinese-speaking-import.js';
const base='/api/v1/chinese',users=[],calls=[];
let admin,chinese,primary,student,other,locked,learner,lesson,set,submission,oldConfig,nextAudioError=false,nextJudgeError=false,noSpeech=false,audioLimited=false,judgeLimitAfter=null;
const questions=['你叫什么名字？','你是哪国人？'];
const wav=(value=.3)=>Buffer.from(encodeSpeakingWav(new Float32Array(4000).fill(value)));
const body=()=>({recording_id:randomUUID(),recorded_at:new Date().toISOString(),questions});
beforeAll(async()=>{
 oldConfig=env.speakingAi;env.speakingAi={enabled:true,key:'test-groq-key',zeroRetentionConfirmed:true,dailyLimit:50};
 for(const options of [{role:'admin'},{role:'admin',adminScope:'chinese'},{role:'admin',adminScope:'primary'},{grade:null},{grade:null},{grade:null,enrolled:false}])users.push(await createTestUser(options));
 [admin,chinese,primary,student,other,locked]=await Promise.all(users.map(loginStudent));learner=users[3];
 lesson=(await admin.post(base+'/lessons').send({level_id:1,title:'Speaking AI fixture',position:1000,status:'published'})).body.data.id;
 set=(await admin.post(base+'/sets').send({lesson_id:lesson,title:'AI questions'})).body.data.id;
 const saved=await admin.put(base+'/sets/'+set).send({title:'AI questions',status:'published',speaking_settings:{duration_seconds:90,order:'sequential',ai_assessment:true},items:questions.map((text,n)=>({kind:'dialogue',data:{practice:'speaking',text,answer_reference:n?'我是越南人。':'我叫安。',assessment_notes:'Chấp nhận tên thật của học sinh.'}}))});expect(saved.status).toBe(200);
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  const speech=String(url).endsWith('/audio/transcriptions');calls.push({speech,url:String(url),body:options.body,multipart:speech?options.body.toString('latin1'):null,headers:options.headers});
  if(speech){
   if(nextAudioError){nextAudioError=false;return new Response('provider-private-detail',{status:503});}
   if(audioLimited)return new Response('provider-private-detail',{status:429});
   if(noSpeech)return Response.json({text:'',segments:[]});
   return Response.json({text:'我叫安。',segments:[{no_speech_prob:.01,avg_logprob:-.1}]});
  }
  if(judgeLimitAfter!==null&&judgeLimitAfter--===0){judgeLimitAfter=null;return new Response('provider-private-detail',{status:429});}
  if(nextJudgeError){nextJudgeError=false;return new Response('provider-private-detail',{status:503});}
  await new Promise(resolve=>setTimeout(resolve,10));
  const input=JSON.parse(JSON.parse(options.body).messages[1].content);
  return Response.json({choices:[{message:{content:JSON.stringify({answers:input.answers.map(answer=>({index:answer.index,content:90,grammar:80,feedback:'Con trả lời đúng ý.',correction:'我叫安。',correction_pinyin:'Wǒ jiào Ān.',errors:[]}))})}}]});
 }));
});
afterEach(()=>{nextAudioError=false;nextJudgeError=false;noSpeech=false;audioLimited=false;judgeLimitAfter=null;env.speakingAi.enabled=true;env.speakingAi.zeroRetentionConfirmed=true;env.speakingAi.dailyLimit=50;});
afterAll(async()=>{vi.unstubAllGlobals();env.speakingAi=oldConfig;if(lesson)await admin.delete(base+'/lessons/'+lesson);for(const user of [...users].reverse())await query('DELETE FROM profiles WHERE id=?',[user.id]);});
const create=async()=>{const response=await student.post(base+'/sets/'+set+'/speaking-submissions').send(body());expect(response.status).toBe(200);return response.body.data.id;};
const clip=(id,q=1,chunk=1,buffer=wav(),agent=student)=>agent.post(`${base}/speaking-submissions/${id}/clips/${q}/${chunk}`).attach('audio',buffer,{filename:'answer.wav',contentType:'audio/wav'});

it('validates exact PCM WAV bytes and excludes question playback from answer sample windows',()=>{
 expect(validateSpeakingWav(wav())).toBe(.25);
 for(const buffer of [Buffer.from('video/mp4'),Buffer.alloc(800046),Buffer.from(wav())]){
  if(buffer.length===8044)buffer.writeUInt16LE(2,22);
  expect(()=>validateSpeakingWav(buffer)).toThrow();
 }
 const ranges=answerSampleRanges({questions,answer_segments:[{index:1,start:2,end:4},{index:2,start:6,end:7},{index:1,start:9,end:10}]},160000);
 expect([...ranges]).toEqual([[1,[[32000,64000],[144000,160000]]],[2,[[96000,112000]]]]);
});

it('imports optional Word answers/criteria but hides them from students before assessment',async()=>{
 const parsed=parseSpeakingText('Câu 1. 你叫什么名字？\nĐáp án tham khảo: 我叫安。\nTiêu chí chấm: Chấp nhận mọi tên riêng.\n2 | 你是哪国人？ | Quốc tịch | 我是越南人。 | Trả lời quốc tịch');
 expect(parsed).toHaveLength(2);expect(parsed[0].data).toMatchObject({answer_reference:'我叫安。',assessment_notes:'Chấp nhận mọi tên riêng.'});expect(parsed[1].data.answer_reference).toBe('我是越南人。');
 const detail=(await student.get(base+'/sets/'+set)).body.data;
 expect(detail.items.every(item=>!('answer_reference'in item.data)&&!('assessment_notes'in item.data))).toBe(true);
 expect((await admin.get(base+'/sets/'+set)).body.data.items[0].data.answer_reference).toBe('我叫安。');
});

it('disables assessment cleanly without configured service and enforces teacher/course authorization',async()=>{
 env.speakingAi.enabled=false;
 const availability=await student.get(base+'/speaking/availability');expect(availability.body.data.configured).toBe(false);expect(JSON.stringify(availability.body)).not.toContain('test-groq-key');
 expect((await student.post(base+'/sets/'+set+'/speaking-submissions').send(body())).status).toBe(503);env.speakingAi.enabled=true;
 expect((await locked.post(base+'/sets/'+set+'/speaking-submissions').send(body())).status).toBe(403);
 expect((await primary.get(base+'/speaking-results')).status).toBe(403);
 expect((await student.get(base+'/speaking-results')).status).toBe(403);
 expect((await request(app).get(base+'/speaking-results')).status).toBe(401);
 await query('UPDATE chinese_sets SET speaking_settings=? WHERE id=?',[JSON.stringify({duration_seconds:90,order:'sequential',ai_assessment:false}),set]);
 expect((await student.post(base+'/sets/'+set+'/speaking-submissions').send(body())).status).toBe(409);
 await query('UPDATE chinese_sets SET speaking_settings=? WHERE id=?',[JSON.stringify({duration_seconds:90,order:'sequential',ai_assessment:true}),set]);
});

it('does not send audio before Groq zero retention has been explicitly confirmed',async()=>{
 const before=calls.length;env.speakingAi.zeroRetentionConfirmed=false;
 expect((await student.get(base+'/speaking/availability')).body.data.configured).toBe(false);
 expect((await student.post(base+'/sets/'+set+'/speaking-submissions').send(body())).status).toBe(503);
 expect(calls).toHaveLength(before);
});

it('creates an immutable server assignment, is idempotent, rejects forged scores and enforces the daily limit',async()=>{
 const input=body(),first=await student.post(base+'/sets/'+set+'/speaking-submissions').send(input);expect(first.status).toBe(200);submission=first.body.data.id;
 expect((await student.post(base+'/sets/'+set+'/speaking-submissions').send(input)).body.data.id).toBe(submission);
 expect((await student.post(base+'/sets/'+set+'/speaking-submissions').send({...body(),score:100})).status).toBe(400);
 expect((await student.post(base+'/sets/'+set+'/speaking-submissions').send({...body(),questions:['别的问题？']})).status).toBe(409);
 env.speakingAi.dailyLimit=1;expect((await student.post(base+'/sets/'+set+'/speaking-submissions').send(body())).status).toBe(429);
 const [row]=await query('SELECT * FROM chinese_speaking_submissions WHERE id=?',[submission]);expect(row.recording_code).toBe(input.recording_id.slice(0,8).toUpperCase());
});

it('protects ownership and prevents access after enrollment is revoked',async()=>{
 expect((await other.get(base+'/speaking-submissions/'+submission)).status).toBe(404);
 expect((await clip(submission,1,1,wav(),other)).status).toBe(404);
 expect((await chinese.get(base+'/speaking-submissions/'+submission)).status).toBe(200);
 await query("UPDATE course_enrollments SET revoked_at=CURRENT_TIMESTAMP(3) WHERE student_id=? AND course_id='hsk-1'",[learner.id]);
 expect((await student.get(base+'/speaking-submissions/'+submission)).status).toBe(403);expect((await clip(submission)).status).toBe(403);
 await query("UPDATE course_enrollments SET revoked_at=NULL WHERE student_id=? AND course_id='hsk-1'",[learner.id]);
});

it('rejects video/invalid/oversized input, bounds questions and processes a repeated chunk only once',async()=>{
 const before=calls.length;
 expect((await clip(submission,1,1,Buffer.from('not WAV: video/mp4'))).status).toBe(415);
 expect((await clip(submission,1,1,Buffer.alloc(800045))).status).toBe(413);
 expect((await clip(submission,3)).status).toBe(400);
 expect(calls).toHaveLength(before);
 expect((await clip(submission)).status).toBe(200);expect((await clip(submission)).status).toBe(200);expect(calls).toHaveLength(before+1);
 expect((await clip(submission,1,1,wav(.7))).status).toBe(409);
 const call=calls.at(-1);expect(call.url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
 expect(call.multipart).toContain('name="model"\r\n\r\nwhisper-large-v3');expect(call.multipart).toContain('name="language"\r\n\r\nzh');
 expect(call.multipart).not.toContain('name="prompt"');expect(call.headers.Authorization).toBe('Bearer test-groq-key');
 expect(call.body.every(byte=>byte===0)).toBe(true);
});

it('saves trusted per-question scores for admin without storing media or sending identity to the text judge',async()=>{
 expect((await clip(submission,2)).status).toBe(200);
 const responses=await Promise.all([1,2].map(()=>student.post(base+'/speaking-submissions/'+submission+'/finish').send({score:100})));
 expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
 const result=responses.find(r=>r.status===200).body.data;
 expect(result.score).toBe(86);expect(result.result.questions).toHaveLength(2);expect(result.result.questions[0]).toMatchObject({pronunciation_score:null,fluency_score:null,content_score:90,score:86});
 expect(result.result.weights).toEqual({content:60,grammar:40,pronunciation:0,fluency:0});expect(result.result.assessment_mode).toBe('content_grammar');
 const judge=calls.find(call=>!call.speech),payload=JSON.parse(judge.body);expect(judge.url).toBe('https://api.groq.com/openai/v1/chat/completions');expect(payload).not.toHaveProperty('store');expect(payload.model).toBe('openai/gpt-oss-120b');expect(judge.body).not.toContain(learner.id);expect(judge.body).not.toContain(learner.username);expect(judge.body).not.toContain('base64');
 const before=calls.length;expect((await student.post(base+'/speaking-submissions/'+submission+'/finish').send({})).status).toBe(200);expect(calls).toHaveLength(before);
 const teacher=await chinese.get(base+'/speaking-results');expect(teacher.headers['cache-control']).toContain('no-store');expect(teacher.body.data.find(row=>row.id===submission)).toMatchObject({student_id:learner.id,score:86,status:'completed'});
 expect((await other.get(base+'/speaking-submissions/'+submission)).status).toBe(404);
 const [row]=await query('SELECT * FROM chinese_speaking_submissions WHERE id=?',[submission]);expect(Object.keys(row).some(key=>/audio|video|media_url/i.test(key))).toBe(false);
});

it('returns a safe free-quota error, erases audio and resumes without resending completed clips',async()=>{
 const id=await create();audioLimited=true;
 const failed=await clip(id);expect(failed.status).toBe(429);expect(failed.body.error.code).toBe('SPEAKING_PROVIDER_LIMIT');
 expect(JSON.stringify(failed.body)).not.toContain('provider-private-detail');expect(calls.at(-1).body.every(byte=>byte===0)).toBe(true);
 audioLimited=false;expect((await clip(id)).status).toBe(200);const before=calls.length;
 expect((await clip(id)).status).toBe(200);expect(calls).toHaveLength(before);
});

it('resumes text grading after a later batch hits quota, without regrading saved answers',async()=>{
 const allQuestions=[...questions,'你住在哪儿？','你今年多大？'];
 const extraSet=(await admin.post(base+'/sets').send({lesson_id:lesson,title:'Free quota fixture'})).body.data.id;
 expect((await admin.put(base+'/sets/'+extraSet).send({title:'Free quota fixture',status:'published',speaking_settings:{duration_seconds:90,order:'free',ai_assessment:true},items:allQuestions.map(text=>({kind:'dialogue',data:{practice:'speaking',speaking_selected:true,text}}))})).status).toBe(200);
 const created=await student.post(base+'/sets/'+extraSet+'/speaking-submissions').send({...body(),questions:allQuestions});expect(created.status).toBe(200);const id=created.body.data.id;
 for(let n=1;n<=4;n++)expect((await clip(id,n)).status).toBe(200);
 const before=calls.filter(c=>!c.speech).length;judgeLimitAfter=1;
 expect((await student.post(base+'/speaking-submissions/'+id+'/finish').send({})).status).toBe(429);
 const [partial]=await query('SELECT snapshot,result FROM chinese_speaking_submissions WHERE id=?',[id]);
 const snapshot=typeof partial.snapshot==='string'?JSON.parse(partial.snapshot):partial.snapshot;
 expect(Object.keys(snapshot.grade_cache)).toHaveLength(3);expect(partial.result).toBeNull();
 expect((await student.get(base+'/speaking-submissions/'+id)).body.data).not.toHaveProperty('snapshot');
 const retry=await student.post(base+'/speaking-submissions/'+id+'/finish').send({});expect(retry.status).toBe(200);expect(retry.body.data.score).toBe(86);
 const judges=calls.filter(c=>!c.speech).slice(before);expect(judges).toHaveLength(3);
 expect(JSON.parse(JSON.parse(judges[2].body).messages[1].content).answers.map(a=>a.index)).toEqual([4]);
});

it('keeps digital silence unscored without asking a provider to invent a transcript',async()=>{
 const id=await create(),before=calls.length;expect((await clip(id,1,1,wav(0))).status).toBe(200);
 const result=await student.post(base+'/speaking-submissions/'+id+'/finish').send({});expect(result.status).toBe(200);
 expect(result.body.data).toMatchObject({status:'needs_review',score:null});expect(calls).toHaveLength(before);
});

it('retries failed providers without persisting audio or recharging completed speech chunks',async()=>{
 const id=await create();nextAudioError=true;
 const failed=await clip(id);expect(failed.status).toBe(502);expect(JSON.stringify(failed.body)).not.toContain('provider-private-detail');expect(calls.at(-1).body.every(byte=>byte===0)).toBe(true);
 expect((await clip(id)).status).toBe(200);expect((await clip(id,2)).status).toBe(200);nextJudgeError=true;
 expect((await student.post(base+'/speaking-submissions/'+id+'/finish').send({})).status).toBe(502);
 const before=calls.filter(c=>c.speech).length;expect((await clip(id)).status).toBe(200);expect(calls.filter(c=>c.speech)).toHaveLength(before);
 expect((await student.post(base+'/speaking-submissions/'+id+'/finish').send({})).status).toBe(200);
});

it('marks unclear or missing answers for teacher review instead of inventing a score',async()=>{
 const id=await create();noSpeech=true;expect((await clip(id)).status).toBe(200);
 const before=calls.length,response=await student.post(base+'/speaking-submissions/'+id+'/finish').send({});expect(response.status).toBe(200);expect(calls).toHaveLength(before);
 expect(response.body.data).toMatchObject({status:'needs_review',score:null});expect(response.body.data.result.questions.every(q=>q.score===null)).toBe(true);
});

it('preserves text results when the source set is deleted and cascades them when the student is deleted',async()=>{
 expect((await admin.delete(base+'/lessons/'+lesson)).status).toBe(200);lesson=null;
 expect((await chinese.get(base+'/speaking-submissions/'+submission)).body.data.result.overall_score).toBe(86);
 await query('DELETE FROM profiles WHERE id=?',[learner.id]);expect(await query('SELECT id FROM chinese_speaking_submissions WHERE student_id=?',[learner.id])).toEqual([]);
 expect(await query('SELECT submission_id FROM chinese_speaking_clips WHERE submission_id=?',[submission])).toEqual([]);
});
