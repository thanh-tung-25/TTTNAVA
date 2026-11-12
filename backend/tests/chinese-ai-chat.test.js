import {beforeAll,afterAll,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import env from '../src/config/env.js';
import {createTestUser,loginStudent} from './helpers/index.js';
import {encodeSpeakingWav} from '../../frontend/assets/js/chinese-speaking-audio.js';
import {defaultChatSettings,chatScenarios} from '../../frontend/assets/js/chinese-ai-chat-data.js';
const base='/api/v1/chinese/ai-chat',users=[],calls=[];
let admin,student,other,locked,primary,lesson,config,limited=false,invalid=false,noSpeech=false,delay=0;
const summary={feedback:'Con đã biết giới thiệu bản thân.',strengths:['Trả lời đúng câu hỏi.'],errors:[],practice_words:['名字']};
const settings={enabled:true,scenario_id:'identity',goal:'Hỏi tên và quốc tịch.',opening:'你好！你叫什么名字？',translation:'Chào bạn! Bạn tên là gì?',required_words:['名字','越南'],max_turns:2};
const wav=(seconds=.25,value=.2)=>Buffer.from(encodeSpeakingWav(new Float32Array(Math.round(seconds*16000)).fill(value)));
const start=(agent=student,id=randomUUID())=>agent.post(base+'/sessions').send({lesson_id:lesson,request_id:id});
const turn=(id,n=1,requestId=randomUUID(),agent=student,text='我叫安。')=>agent.post(`${base}/sessions/${id}/turns/${n}/${requestId}/text`).send({text});
beforeAll(async()=>{
 config=env.speakingAi;env.speakingAi={enabled:true,key:'private-test-groq-key',zeroRetentionConfirmed:true,dailyLimit:5};
 for(const options of [{role:'admin',adminScope:'chinese'},{grade:null},{grade:null},{grade:null,enrolled:false},{role:'admin',adminScope:'primary'}])users.push(await createTestUser(options));
 [admin,student,other,locked,primary]=await Promise.all(users.map(loginStudent));
 const created=await admin.post('/api/v1/chinese/lessons').send({level_id:1,title:'Bài 2. Chat test',position:1001,status:'published'});expect(created.status).toBe(200);lesson=created.body.data.id;
 expect((await admin.put(base+'/lessons/'+lesson).send(settings)).status).toBe(200);
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  const speech=String(url).endsWith('/audio/transcriptions');calls.push({speech,body:options.body,url:String(url),headers:options.headers});
  if(delay)await new Promise(r=>setTimeout(r,delay));
  if(limited)return new Response('private-provider-error',{status:429});
  if(speech)return Response.json({text:noSpeech?'':'我叫安。',segments:[]});
  return Response.json({choices:[{message:{content:invalid?'{}':JSON.stringify({reply_zh:'很高兴认识你！你是哪国人？',translation_vi:'Rất vui được làm quen! Bạn là người nước nào?',hint_zh:'我是越南人。',summary})}}]});
 }));
});
afterEach(async()=>{
 limited=false;invalid=false;noSpeech=false;delay=0;calls.length=0;env.speakingAi.enabled=true;env.speakingAi.zeroRetentionConfirmed=true;
 for(const user of users)await query('DELETE FROM chinese_ai_chat_sessions WHERE student_id=?',[user.id]);
 await admin.put(base+'/lessons/'+lesson).send(settings);
});
afterAll(async()=>{vi.unstubAllGlobals();env.speakingAi=config;if(lesson)await admin.delete('/api/v1/chinese/lessons/'+lesson);for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);});

it('maps ten lessons to appropriate conversation scenes',()=>{
 expect(Array.from({length:10},(_,i)=>defaultChatSettings({title:`Bài ${i+1}. Test`,position:i+1}).scenario_id)).toEqual(chatScenarios.map(s=>s.id));
});
it('enforces enrollment, Chinese admin scope and provider/ZDR configuration',async()=>{
 expect((await locked.get(base+'?level=1')).status).toBe(403);expect((await primary.get(base+'?level=1')).status).toBe(403);
 expect((await student.get(base+'?level=9')).status).toBe(200);expect((await student.get(base+'?level=10')).status).toBe(400);
 expect((await student.put(base+'/lessons/'+lesson).send(settings)).status).toBe(403);
 env.speakingAi.zeroRetentionConfirmed=false;
 expect((await student.get(base+'?level=1')).body.data.configured).toBe(false);expect((await start()).status).toBe(503);expect(calls).toHaveLength(0);
});
it('rejects invalid teacher settings and respects per-lesson pause',async()=>{
 expect((await admin.put(base+'/lessons/'+lesson).send({...settings,max_turns:11})).status).toBe(400);
 expect((await admin.put(base+'/lessons/'+lesson).send({...settings,opening:'Hello'})).status).toBe(400);
 await admin.put(base+'/lessons/'+lesson).send({...settings,enabled:false});expect((await start()).status).toBe(409);
 expect((await start(admin)).status).toBe(200);
});
it('resumes one active session and isolates ownership',async()=>{
 const first=await start(),id=first.body.data.id;expect(first.status).toBe(200);
 expect((await start()).body.data.id).toBe(id);expect((await student.get(base+'?level=1')).body.data.remaining).toBe(1);
 expect((await other.get(base+'/sessions/'+id)).status).toBe(404);expect((await turn(id,1,randomUUID(),other)).status).toBe(404);
 expect((await admin.post(base+'/sessions/'+id+'/finish').send({})).status).toBe(404);expect(calls).toHaveLength(0);
});
it('continues from answers, supports retry without duplicate calls, and clears context on completion',async()=>{
 const id=(await start()).body.data.id,rid=randomUUID();
 const a=await turn(id,1,rid);expect(a.status).toBe(200);expect(a.body.data).toMatchObject({turn_count:1,status:'active',transcript:'我叫安。'});
 expect((await turn(id,1,rid)).status).toBe(200);expect(calls).toHaveLength(1);
 expect((await turn(id,1,rid,student,'别的回答')).status).toBe(409);
 expect((await turn(id,1)).body.error.code).toBe('CHAT_STALE_TURN');expect(calls).toHaveLength(1);
 const finalId=randomUUID(),done=await turn(id,2,finalId);expect(done.status).toBe(200);expect(done.body.data).toMatchObject({turn_count:2,status:'completed',summary});
 const replay=await turn(id,2,finalId);expect(replay.status).toBe(200);expect(replay.body.data.reply.reply_zh).not.toMatch(/[？?]/);expect(calls).toHaveLength(2);
 const input=JSON.parse(calls[1].body);expect(input.model).toBe('openai/gpt-oss-120b');expect(input.messages.some(m=>m.content==='我叫安。')).toBe(true);expect(JSON.parse(input.messages[1].content).last_turn).toBe(true);expect(done.body.data.reply.reply_zh).not.toMatch(/[？?]/);expect(done.body.data.reply.hint_zh).toBe('');
 const [stored]=await query('SELECT context,last_response,summary FROM chinese_ai_chat_sessions WHERE id=?',[id]);expect(stored.context).toBeNull();expect(stored.last_response).toBeNull();expect(stored.summary).toBeTruthy();
 const report=await admin.get(base+'/results?level=1');expect(report.body.data.find(r=>r.id===id).summary).toEqual(summary);expect(JSON.stringify(report.body)).not.toContain('context');
 expect((await student.get(base+'/results?level=1')).status).toBe(403);
});
it('enforces two sessions per day without consuming extra sessions for repeat starts',async()=>{
 const starts=await Promise.all([start(),start()]);expect(starts.map(r=>r.status)).toEqual([200,200]);expect(starts[0].body.data.id).toBe(starts[1].body.data.id);
 for(let n=0;n<2;n++){const id=(await start()).body.data.id;expect((await student.post(base+'/sessions/'+id+'/finish').send({})).status).toBe(200);}
 expect((await start()).status).toBe(429);expect((await student.get(base+'?level=1')).body.data.remaining).toBe(0);
});
it('releases failed leases and preserves turns when the free provider is limited or invalid',async()=>{
 const id=(await start()).body.data.id,rid=randomUUID();limited=true;
 const fail=await turn(id,1,rid);expect(fail.status).toBe(429);expect(JSON.stringify(fail.body)).not.toContain('private-provider-error');expect(JSON.stringify(fail.body)).not.toContain('private-test-groq-key');
 invalid=true;limited=false;expect((await turn(id,1,rid)).status).toBe(502);
 const row=(await query('SELECT * FROM chinese_ai_chat_sessions WHERE id=?',[id]))[0];expect(Number(row.turn_count)).toBe(0);expect(row.lease_id).toBeNull();
 invalid=false;expect((await turn(id,1,rid)).status).toBe(200);
});
it('serializes concurrent answers without holding a transaction over the provider call',async()=>{
 const id=(await start()).body.data.id;delay=80;
 const replies=await Promise.all([turn(id),turn(id)]);expect(replies.map(r=>r.status).sort()).toEqual([200,409]);expect(calls).toHaveLength(1);
});
it('rejects oversized/invalid/silent audio and wipes outbound multipart buffers',async()=>{
 const id=(await start()).body.data.id,send=(buffer,rid=randomUUID())=>student.post(`${base}/sessions/${id}/turns/1/${rid}/audio`).attach('audio',buffer,{filename:'answer.wav',contentType:'audio/wav'});
 expect((await send(Buffer.from('video data'))).status).toBe(415);expect((await send(wav(20.1))).status).toBe(413);
 expect((await send(wav(.25,0))).status).toBe(422);expect(calls).toHaveLength(0);
 const rid=randomUUID();expect((await send(wav(),rid)).status).toBe(200);expect(calls.filter(c=>c.speech)).toHaveLength(1);
 expect(calls[0].body.every(value=>value===0)).toBe(true);expect((await send(wav(),rid)).status).toBe(200);expect(calls).toHaveLength(2);
});
it('finishes early, expires abandoned context and excludes previews from teacher reports',async()=>{
 const id=(await start()).body.data.id;await turn(id);await query('UPDATE chinese_ai_chat_sessions SET expires_at=? WHERE id=?',[new Date(Date.now()-1000),id]);
 expect((await student.get(base+'/sessions/'+id)).body.data.status).toBe('expired');const [row]=await query('SELECT context,last_response FROM chinese_ai_chat_sessions WHERE id=?',[id]);expect(row.context).toBeNull();expect(row.last_response).toBeNull();
 const preview=(await start(admin)).body.data;expect(preview.is_preview).toBe(true);await turn(preview.id,1,randomUUID(),admin);await admin.post(base+'/sessions/'+preview.id+'/finish').send({});
 const rows=(await admin.get(base+'/results?level=1')).body.data;expect(rows.some(r=>r.id===preview.id)).toBe(false);expect(rows.some(r=>r.id===id)).toBe(true);
});
