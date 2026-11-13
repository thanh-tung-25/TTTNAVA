import {beforeAll,afterAll,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import env from '../src/config/env.js';
import {createTestUser,loginStudent} from './helpers/index.js';
import {encodeSpeakingWav} from '../../frontend/assets/js/chinese-speaking-audio.js';
import {createVoiceActivity} from '../../frontend/assets/js/chinese-ai-chat-audio.js';
import {defaultChatSettings,chatScenarios} from '../../frontend/assets/js/chinese-ai-chat-data.js';
import {sealChatState,openChatState} from '../src/services/chinese-chat-state.js';
const base='/api/v1/chinese/ai-chat',users=[],calls=[];
let admin,student,other,locked,primary,lesson,config,limited=false,invalid=false,noSpeech=false,delay=0;
const settings={enabled:true,scenario_id:'identity',goal:'Làm quen và trò chuyện.',opening:'你好！你叫什么名字？',translation:'Chào bạn! Bạn tên là gì?',required_words:['名字','越南'],max_turns:10};
const wav=(seconds=.25,value=.2)=>Buffer.from(encodeSpeakingWav(new Float32Array(Math.round(seconds*16000)).fill(value)));
const start=async(agent=student,id=randomUUID())=>agent.post(base+'/sessions').send({lesson_id:lesson,request_id:id});
const turn=(session,n=1,requestId=randomUUID(),agent=student,text='我叫安。',state=session.state)=>agent.post(base+'/sessions/'+session.id+'/turns/'+n+'/'+requestId+'/text').send({text,state});
const upload=(session,buffer=wav(),rid=randomUUID())=>student.post(base+'/sessions/'+session.id+'/turns/1/'+rid+'/audio').field('state',session.state).attach('audio',buffer,{filename:'turn.wav',contentType:'audio/wav'});
const row=async id=>(await query('SELECT * FROM chinese_ai_chat_sessions WHERE id=?',[id]))[0];
const privateColumns=stored=>{expect(stored.context).toBeNull();expect(stored.summary).toBeNull();expect(stored.last_response).toBeNull();};
beforeAll(async()=>{
 config=env.speakingAi;env.speakingAi={enabled:true,key:'private-test-groq-key',zeroRetentionConfirmed:true,dailyLimit:5};
 for(const opts of [{role:'admin',adminScope:'chinese'},{grade:null},{grade:null},{grade:null,enrolled:false},{role:'admin',adminScope:'primary'}])users.push(await createTestUser(opts));
 [admin,student,other,locked,primary]=await Promise.all(users.map(loginStudent));
 const created=await admin.post('/api/v1/chinese/lessons').send({level_id:1,title:'Bài 2. Private chat fixture',position:1001,status:'published'});expect(created.status).toBe(200);lesson=created.body.data.id;
 expect((await admin.put(base+'/lessons/'+lesson).send(settings)).status).toBe(200);
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  const speech=String(url).endsWith('/audio/transcriptions');calls.push({speech,body:options.body,url:String(url)});
  if(delay)await new Promise(r=>setTimeout(r,delay));
  if(limited)return new Response('private-provider-error',{status:429});
  if(speech)return Response.json({text:noSpeech?'':'我叫安。',segments:[]});
  return Response.json({choices:[{message:{content:invalid?'{}':JSON.stringify({reply_zh:'很高兴认识你！你想聊什么？',translation_vi:'Rất vui được gặp bạn! Bạn muốn nói chuyện gì?'})}}]});
 }));
});
afterEach(async()=>{
 limited=false;invalid=false;noSpeech=false;delay=0;calls.length=0;env.speakingAi.enabled=true;env.speakingAi.zeroRetentionConfirmed=true;
 for(const u of users)await query('DELETE FROM chinese_ai_chat_sessions WHERE student_id=?',[u.id]);
 await admin.put(base+'/lessons/'+lesson).send(settings);
});
afterAll(async()=>{vi.unstubAllGlobals();env.speakingAi=config;if(lesson)await admin.delete('/api/v1/chinese/lessons/'+lesson);for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);});
it('keeps ten scene defaults and detects speech completion without sending silence or brief noise',()=>{
 expect(Array.from({length:10},(_,i)=>defaultChatSettings({title:'Bài '+(i+1),position:i+1}).scenario_id)).toEqual(chatScenarios.map(s=>s.id));
 const d=createVoiceActivity();expect(d.sample(0,0).done).toBe(false);expect(d.sample(.05,100).speaking).toBe(false);expect(d.sample(0,150).speaking).toBe(false);
 d.sample(.05,500);expect(d.sample(.05,650).speaking).toBe(true);expect(d.sample(0,1500).done).toBe(false);expect(d.sample(0,2100).done).toBe(true);
 const sustained=createVoiceActivity();sustained.sample(.05,0);expect(sustained.sample(.05,19501).limit).toBe(true);
});
it('checks enrollment, role scope and configured ZDR before sending data',async()=>{
 expect((await locked.get(base+'?level=1')).status).toBe(403);expect((await primary.get(base+'?level=1')).status).toBe(403);
 expect((await student.get(base+'?level=9')).status).toBe(200);expect((await student.get(base+'?level=10')).status).toBe(400);
 expect((await student.put(base+'/lessons/'+lesson).send(settings)).status).toBe(403);
 env.speakingAi.zeroRetentionConfirmed=false;expect((await start()).status).toBe(503);expect(calls).toHaveLength(0);
});
it('starts an encrypted client-only context without retaining a transcript or summary',async()=>{
 const r=await start();expect(r.status).toBe(200);const s=r.body.data;expect(s.state).toMatch(/^[A-Za-z0-9_-]+$/);expect(s.state).not.toContain(settings.opening);
 const decoded=openChatState(s.state,users[1],s.id);expect(decoded.context).toEqual([{role:'assistant',content:settings.opening}]);expect(decoded.turn).toBe(0);privateColumns(await row(s.id));
 const meta=(await student.get(base+'?level=1')).body.data;expect(meta.limits).toMatchObject({session_minutes:5,turns:20});expect(meta.active).not.toHaveProperty('state');expect(meta.active).not.toHaveProperty('reply');
 expect((await student.get(base+'/sessions/'+s.id)).body.data).not.toHaveProperty('summary');
});
it('rejects token tampering, cross-account and cross-session state reuse',async()=>{
 const s=(await start()).body.data;
 expect((await turn(s,1,randomUUID(),other)).status).toBe(409);
 expect((await turn(s,1,randomUUID(),student,'你好。','X'+s.state.slice(1))).status).toBe(409);
 const forged=sealChatState({v:2,owner:users[2].id,session:s.id,turn:0,until:Date.now()+30000,context:[]});expect((await turn(s,1,randomUUID(),student,'你好。',forged)).status).toBe(409);
 expect((await student.post(base+'/sessions/'+s.id+'/turns/1/'+randomUUID()+'/text').send({text:'你好'})).status).toBe(400);expect(calls).toHaveLength(0);
});
it('continues naturally from encrypted context and never stores either speaker text',async()=>{
 const s=(await start()).body.data,rid=randomUUID(),first=await turn(s,1,rid);expect(first.status).toBe(200);const next=first.body.data;
 expect(next).not.toHaveProperty('summary');expect(next).not.toHaveProperty('transcript');privateColumns(await row(s.id));
 const state=openChatState(next.state,users[1],s.id);expect(state.context.some(m=>m.content==='我叫安。')).toBe(true);
 const second=await turn(next,2);expect(second.status).toBe(200);const input=JSON.parse(calls[1].body);expect(input.messages.some(m=>m.content==='我叫安。')).toBe(true);
 expect(JSON.parse(input.messages[1].content)).not.toHaveProperty('earlier_summary');
 expect(input.messages[0].content).toContain('Không chấm điểm');expect(input.max_completion_tokens).toBe(600);
 privateColumns(await row(s.id));expect(JSON.stringify(await row(s.id))).not.toContain('我叫安');
});
it('recovers a duplicate request without a second AI call or a server conversation cache',async()=>{
 const s=(await start()).body.data,rid=randomUUID();expect((await turn(s,1,rid)).status).toBe(200);
 const replay=await turn(s,1,rid);expect(replay.status).toBe(200);expect(replay.body.data.recovered).toBe(true);expect(replay.body.data.turn_count).toBe(1);expect(calls).toHaveLength(1);
 expect((await turn(s,1,rid,student,'别的。')).status).toBe(409);expect((await turn(s)).status).toBe(409);privateColumns(await row(s.id));
});
it('serializes concurrent answers and releases leases after provider quota or malformed responses',async()=>{
 const s=(await start()).body.data;delay=80;const both=await Promise.all([turn(s),turn(s)]);expect(both.map(r=>r.status).sort()).toEqual([200,409]);expect(calls).toHaveLength(1);
 const next=(await start()).body.data;limited=true;delay=0;const fail=await turn(next,2);expect(fail.status).toBe(429);expect(JSON.stringify(fail.body)).not.toContain('private-provider-error');
 expect((await row(next.id)).lease_id).toBeNull();privateColumns(await row(next.id));limited=false;invalid=true;expect((await turn(next,2)).status).toBe(502);
 invalid=false;expect((await turn(next,2)).status).toBe(200);
});
it('receives only short WAV with sealed state, rejects silence, and wipes outbound audio',async()=>{
 const s=(await start()).body.data;expect((await upload(s,Buffer.from('video'))).status).toBe(415);expect((await upload(s,wav(20.1))).status).toBe(413);
 expect((await upload(s,wav(.25,0))).status).toBe(422);expect(calls).toHaveLength(0);
 expect((await upload(s)).status).toBe(200);expect(calls[0].body.every(b=>b===0)).toBe(true);privateColumns(await row(s.id));
});
it('ends immediately while AI is processing, discards late responses and disables teacher reports',async()=>{
 const s=(await start()).body.data;delay=150;const running=turn(s).then(r=>r);
 for(let n=0;n<40&&!calls.length;n++)await new Promise(r=>setTimeout(r,5));
 expect((await student.post(base+'/sessions/'+s.id+'/finish').send({})).status).toBe(200);
 expect((await running).status).toBe(409);const saved=await row(s.id);expect(saved.status).toBe('completed');privateColumns(saved);
 expect((await admin.get(base+'/results?level=1')).status).toBe(410);expect((await student.get(base+'/results?level=1')).status).toBe(403);
});
it('enforces time and daily budgets while restarting a page does not restore conversation text',async()=>{
 const s=(await start()).body.data,next=(await turn(s)).body.data;
 const restarted=(await start()).body.data;expect(restarted.id).toBe(s.id);expect(restarted.turn_count).toBe(1);expect(openChatState(restarted.state,users[1],s.id).context).toEqual([{role:'assistant',content:settings.opening}]);
 await student.post(base+'/sessions/'+s.id+'/finish').send({});const second=(await start()).body.data;await student.post(base+'/sessions/'+second.id+'/finish').send({});expect((await start()).status).toBe(429);
 expect((await other.post(base+'/sessions/'+s.id+'/finish').send({})).status).toBe(404);expect(next.state).toBeTruthy();
});
it('finishes at the hard turn limit without generating a final grade or extra question',async()=>{
 const s=(await start()).body.data;await query('UPDATE chinese_ai_chat_sessions SET turn_count=19 WHERE id=?',[s.id]);
 const state=sealChatState({v:2,owner:users[1].id,session:s.id,turn:19,until:new Date(s.expires_at).getTime(),context:[{role:'assistant',content:'你好！'}]});
 const done=await turn(s,20,randomUUID(),student,'再见！',state);expect(done.status).toBe(200);expect(done.body.data.status).toBe('completed');expect(done.body.data).not.toHaveProperty('state');expect(done.body.data.reply.reply_zh).not.toMatch(/[？?]/);expect(calls).toHaveLength(0);privateColumns(await row(s.id));
});
it('expires metadata and honors a paused lesson without revealing old report content',async()=>{
 const s=(await start()).body.data;await admin.put(base+'/lessons/'+lesson).send({...settings,enabled:false});expect((await turn(s)).status).toBe(409);
 expect((await start(admin)).status).toBe(200);await query('UPDATE chinese_ai_chat_sessions SET expires_at=? WHERE id=?',[new Date(Date.now()-1000),s.id]);
 expect((await student.get(base+'/sessions/'+s.id)).body.data.status).toBe('expired');privateColumns(await row(s.id));
});
