import {beforeAll,beforeEach,afterEach,afterAll,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import * as webpush from 'web-push';
import request from 'supertest';
import {createTestUser,loginStudent,app} from './helpers/index.js';
import {query} from '../src/config/db.js';
import {validPushEndpoint} from '../src/services/chat-push.js';
vi.mock('web-push',async importOriginal=>({...await importOriginal(),sendNotification:vi.fn(async()=>({}))}));

const base='/api/v1/chat/calls',users=[],agents=[],clients=[randomUUID(),randomUUID(),randomUUID()];
const names=['CHAT_CALLS_ENABLED','CLOUDFLARE_TURN_KEY_ID','CLOUDFLARE_TURN_API_TOKEN','CHAT_CALL_MAX_CONCURRENT','CHAT_CALL_MONTHLY_MINUTES','WEB_PUSH_PUBLIC_KEY','WEB_PUSH_PRIVATE_KEY','WEB_PUSH_SUBJECT'];
const saved=Object.fromEntries(names.map(k=>[k,process.env[k]]));
let room;
const sdp='v=0\r\no=- 1 1 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n';
const start=(who=0,id=room)=>agents[who].post(base).send({room_id:id,client_id:clients[who],media:'video'});
const connect=async(a,b)=>{
 await agents[a].put('/api/v1/chat/friends/'+users[b].id).send({action:'request'});
 expect((await agents[b].put('/api/v1/chat/friends/'+users[a].id).send({action:'accept'})).status).toBe(200);
};
beforeAll(async()=>{
 process.env.CHAT_CALLS_ENABLED='true';process.env.CLOUDFLARE_TURN_KEY_ID='test-key-id';process.env.CLOUDFLARE_TURN_API_TOKEN='server-secret-must-never-leak';
 for(const options of [{creatorScope:'chinese'},{creatorScope:'chinese'},{creatorScope:'chinese'},{role:'admin'},{role:'admin',adminScope:'chinese'},{creatorScope:'super'}]){
  const u=await createTestUser(options);users.push(u);agents.push(await loginStudent(u));
 }
 await connect(0,1);await connect(0,2);await connect(1,2);
 room=(await agents[0].post('/api/v1/chat/rooms').send({kind:'direct',members:[users[1].id]})).body.data.id;
});
beforeEach(async()=>{
 vi.mocked(webpush.sendNotification).mockClear();
 process.env.CHAT_CALLS_ENABLED='true';process.env.CHAT_CALL_MAX_CONCURRENT='5';process.env.CHAT_CALL_MONTHLY_MINUTES='3000';
 delete process.env.WEB_PUSH_PUBLIC_KEY;delete process.env.WEB_PUSH_PRIVATE_KEY;delete process.env.WEB_PUSH_SUBJECT;
 await query('DELETE FROM chat_calls WHERE caller_id IN (?,?,?)',[users[0].id,users[1].id,users[2].id]);
 await query('DELETE FROM chat_call_preferences WHERE student_id IN (?,?)',[users[0].id,users[1].id]);
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({iceServers:{urls:['stun:stun.cloudflare.com:3478','turn:turn.cloudflare.com:3478?transport=udp'],username:'temporary-user',credential:'temporary-secret'}})})));
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
afterAll(async()=>{
 for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);
 for(const key of names){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
});

it('requires authentication, gates disabled service, and exposes only public configuration',async()=>{
 expect((await request(app).get(base+'/config')).status).toBe(401);
 const data=(await agents[0].get(base+'/config')).body.data;
 expect(data).toMatchObject({enabled:true,receiving:true,push_enabled:false});expect(JSON.stringify(data)).not.toContain('server-secret');
 process.env.CHAT_CALLS_ENABLED='false';
 expect((await agents[0].get(base+'/config')).body.data).toEqual({enabled:false,push_enabled:false});
 expect((await start()).status).toBe(503);
});
it('accepts only friends in a direct room and preserves administrator visibility',async()=>{
 expect((await start(2)).status).toBe(404);
 const group=(await agents[0].post('/api/v1/chat/rooms').send({kind:'group',title:'Study',members:[users[1].id]})).body.data.id;
 expect((await start(0,group)).status).toBe(404);
 await agents[0].put('/api/v1/chat/friends/'+users[1].id).send({action:'remove'});
 expect((await start()).status).toBe(403);await connect(0,1);
 await connect(0,4);const adminRoom=(await agents[4].post('/api/v1/chat/rooms').send({kind:'direct',members:[users[0].id]})).body.data.id;
 expect((await agents[4].post(base).send({room_id:adminRoom,client_id:randomUUID(),media:'audio'})).status).toBe(200);
 expect((await agents[4].get('/api/v1/chat/students').query({q:users[5].username})).body.data).toHaveLength(0);
 await query('DELETE FROM chat_calls WHERE caller_id=?',[users[4].id]);
});
it('binds signaling to participants and the accepting device, and erases SDP on hangup',async()=>{
 const made=await start();expect(made.status).toBe(200);const id=made.body.data.id;
 expect((await agents[2].post(base+'/'+id+'/poll').send({client_id:clients[2]})).status).toBe(404);
 expect((await agents[0].put(base+'/'+id+'/accept').send({client_id:clients[0]})).status).toBe(403);
 expect((await agents[1].get(base+'/incoming')).body.data).toBeNull();
 expect((await agents[0].put(base+'/'+id+'/signal').send({client_id:clients[0],type:'offer',sdp})).status).toBe(200);
 const incoming=(await agents[1].get(base+'/incoming')).body.data;expect(incoming.id).toBe(id);expect(incoming).not.toHaveProperty('offer_sdp');
 const accepted=await agents[1].put(base+'/'+id+'/accept').send({client_id:clients[1]});expect(accepted.status).toBe(200);expect(accepted.body.data.offer_sdp).toBe(sdp);
 expect((await agents[1].put(base+'/'+id+'/accept').send({client_id:randomUUID()})).status).toBe(409);
 expect((await agents[0].put(base+'/'+id+'/signal').send({client_id:clients[0],type:'answer',sdp})).status).toBe(403);
 expect((await agents[1].put(base+'/'+id+'/signal').send({client_id:clients[1],type:'answer',sdp})).status).toBe(200);
 expect((await agents[0].post(base+'/'+id+'/poll').send({client_id:randomUUID()})).body.data).not.toHaveProperty('answer_sdp');
 expect((await agents[0].post(base+'/'+id+'/poll').send({client_id:clients[0]})).body.data.answer_sdp).toBe(sdp);
 await agents[0].post(base+'/'+id+'/end').send({client_id:clients[0],reason:'hangup'});
 const [row]=await query('SELECT state,offer_sdp,answer_sdp FROM chat_calls WHERE id=?',[id]);expect(row).toEqual({state:'ended',offer_sdp:null,answer_sdp:null});
 expect((await agents[0].post(base+'/'+id+'/credentials').send({client_id:clients[0]})).status).toBe(409);
});
it('issues temporary relay credentials only for the claimed live call',async()=>{
 const id=(await start()).body.data.id;
 expect((await agents[1].post(base+'/'+id+'/credentials').send({client_id:clients[1]})).status).toBe(409);
 const res=await agents[0].post(base+'/'+id+'/credentials').send({client_id:clients[0]});expect(res.status).toBe(200);
 expect(res.body.data).toMatchObject({iceTransportPolicy:'relay',iceServers:[{urls:['turn:turn.cloudflare.com:3478?transport=udp'],credential:'temporary-secret'}]});
 expect(JSON.stringify(res.body)).not.toContain('server-secret');expect(fetch).toHaveBeenCalledTimes(1);
 const options=fetch.mock.calls[0][1];expect(JSON.parse(options.body).ttl).toBeLessThanOrEqual(1005);expect(options.headers.Authorization).toContain('server-secret');
});
it('serializes simultaneous calls and reserves global time and capacity',async()=>{
 const second=(await agents[0].post('/api/v1/chat/rooms').send({kind:'direct',members:[users[2].id]})).body.data.id;
 const results=await Promise.all([start(),start(0,second)]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);
 const ok=results.find(r=>r.status===200);expect((await start(0,ok.body.data.room_id)).body.data.id).toBe(ok.body.data.id);
 await connect(2,5);
 const other=(await agents[2].post('/api/v1/chat/rooms').send({kind:'direct',members:[users[5].id]})).body.data.id;
 process.env.CHAT_CALL_MAX_CONCURRENT='1';
 expect((await start(2,other)).status).toBe(409);
 await agents[0].post(base+'/'+ok.body.data.id+'/end').send({client_id:clients[0],reason:'hangup'});
 process.env.CHAT_CALL_MONTHLY_MINUTES='1';expect((await start()).body.error.code).toBe('CALL_MONTHLY_LIMIT');
});
it('stops active calls after blocking, unfriend, opting out, account lock or ring timeout',async()=>{
 let id=(await start()).body.data.id;
 await agents[1].put('/api/v1/chat/blocks/'+users[0].id);
 expect((await agents[0].post(base+'/'+id+'/poll').send({client_id:clients[0]})).body.data).toMatchObject({state:'ended',outcome:'unavailable'});
 await agents[1].delete('/api/v1/chat/blocks/'+users[0].id);await connect(0,1);
 await query('DELETE FROM chat_calls WHERE id=?',[id]);id=(await start()).body.data.id;
 await agents[0].put('/api/v1/chat/friends/'+users[1].id).send({action:'remove'});
 expect((await agents[0].post(base+'/'+id+'/poll').send({client_id:clients[0]})).body.data).toMatchObject({state:'ended',outcome:'unavailable'});
 await connect(0,1);await query('DELETE FROM chat_calls WHERE id=?',[id]);id=(await start()).body.data.id;
 await agents[1].put(base+'/preferences').send({enabled:false});expect((await start()).status).toBe(403);
 expect((await agents[0].post(base+'/'+id+'/poll').send({client_id:clients[0]})).body.data.state).toBe('ended');
 await agents[1].put(base+'/preferences').send({enabled:true});await query('DELETE FROM chat_calls WHERE id=?',[id]);id=(await start()).body.data.id;
 await query('UPDATE profiles SET banned_until=? WHERE id=?',['2999-01-01',users[1].id]);
 expect((await agents[0].post(base+'/'+id+'/credentials').send({client_id:clients[0]})).status).toBe(409);
 await query('UPDATE profiles SET banned_until=NULL WHERE id=?',[users[1].id]);await query('DELETE FROM chat_calls WHERE id=?',[id]);id=(await start()).body.data.id;
 await query('UPDATE chat_calls SET ring_until=? WHERE id=?',[new Date(Date.now()-1000),id]);
 expect((await agents[0].post(base+'/'+id+'/poll').send({client_id:clients[0]})).body.data).toMatchObject({state:'ended',outcome:'missed'});
});
it('expires abandoned calls and enforces the duration deadline without leaking old SDP',async()=>{
 let id=(await start()).body.data.id;
 await agents[0].put(base+'/'+id+'/signal').send({client_id:clients[0],type:'offer',sdp});
 await query('UPDATE chat_calls SET caller_seen_at=? WHERE id=?',[new Date(Date.now()-60000),id]);
 expect((await agents[1].get(base+'/incoming')).body.data).toBeNull();
 expect((await query('SELECT offer_sdp,state FROM chat_calls WHERE id=?',[id]))[0]).toEqual({offer_sdp:null,state:'ended'});
 await query('DELETE FROM chat_calls WHERE id=?',[id]);id=(await start()).body.data.id;
 await query('UPDATE chat_calls SET deadline_at=? WHERE id=?',[new Date(Date.now()-1000),id]);
 expect((await agents[0].post(base+'/'+id+'/poll').send({client_id:clients[0]})).body.data).toMatchObject({state:'ended',outcome:'limit'});
});
it('turning off incoming calls still allows the user to initiate a call',async()=>{
 await agents[0].put(base+'/preferences').send({enabled:false});
 const made=await start();expect(made.status).toBe(200);
 await agents[0].post(base+'/'+made.body.data.id+'/end').send({client_id:clients[0],reason:'hangup'});
 expect((await start(1)).status).toBe(403);
});
it('shows history only to members, and restricts report review to super admins',async()=>{
 const id=(await start()).body.data.id;await agents[1].post(base+'/'+id+'/end').send({client_id:clients[1],reason:'declined'});
 expect((await agents[2].get(base+'/history').query({room_id:room})).status).toBe(404);
 expect((await agents[0].get(base+'/history').query({room_id:room})).body.data[0]).toMatchObject({id,outcome:'declined'});
 expect((await agents[2].post(base+'/'+id+'/report').send({reason:'Không thuộc cuộc gọi'})).status).toBe(404);
 expect((await agents[1].post(base+'/'+id+'/report').send({reason:'Gọi làm phiền'})).status).toBe(200);
 expect((await agents[4].get(base+'/reports')).status).toBe(403);
 const report=(await agents[3].get(base+'/reports')).body.data.find(r=>r.caller===users[0].displayName);expect(report.reason).toBe('Gọi làm phiền');
 expect((await agents[3].put(base+'/reports/'+report.id).send({})).status).toBe(200);
});
it('rejects push SSRF and removes this device subscription on logout',async()=>{
 const keys=webpush.generateVAPIDKeys();process.env.WEB_PUSH_PUBLIC_KEY=keys.publicKey;process.env.WEB_PUSH_PRIVATE_KEY=keys.privateKey;process.env.WEB_PUSH_SUBJECT='https://ttnava.example';
 const key=Buffer.concat([Buffer.from([4]),Buffer.alloc(64,1)]).toString('base64url'),auth=Buffer.alloc(16,2).toString('base64url'),device=randomUUID();
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:key,auth}};
 for(const endpoint of ['http://fcm.googleapis.com/x','https://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com.attacker.test/x','https://fcm.googleapis.com:8443/x']){
  expect(validPushEndpoint(endpoint)).toBe(false);expect((await agents[0].post(base+'/push').send({device_id:device,subscription:{...subscription,endpoint}})).status).toBe(400);
 }
 expect((await agents[0].post(base+'/push').send({device_id:device,subscription})).status).toBe(200);
 expect((await query('SELECT student_id FROM chat_push_subscriptions WHERE device_id=?',[device])).length).toBe(1);
 const send=vi.mocked(webpush.sendNotification);
 const id=(await start(1)).body.data.id;
 await agents[1].put(base+'/'+id+'/signal').send({client_id:clients[1],type:'offer',sdp});
 expect(send).toHaveBeenCalledTimes(1);const payload=JSON.parse(send.mock.calls[0][1]);expect(payload).toEqual({type:'incoming-call',call_id:id});
 // Even if localStorage/device ID was cleared, the authenticated session is enough.
 process.env.CHAT_CALLS_ENABLED='false';
 const logout=await agents[0].post('/api/v1/auth/logout');expect(logout.status).toBe(200);
 expect(await query('SELECT student_id FROM chat_push_subscriptions WHERE device_id=?',[device])).toHaveLength(0);
 agents[0]=await loginStudent(users[0]);
});
it('serves the push worker at root without caching private pages',async()=>{
 const res=await request(app).get('/chat-sw.js');expect(res.status).toBe(200);
 expect(res.headers['service-worker-allowed']).toBe('/');expect(res.headers['cache-control']).toContain('no-cache');
 expect(res.text).not.toContain("addEventListener('fetch'");
});
