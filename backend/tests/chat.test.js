import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createTestUser,loginStudent,app} from './helpers/index.js';
import request from 'supertest';
import {query} from '../src/config/db.js';
const users=[],agents=[];let direct,group,message,reportId;
beforeAll(async()=>{for(const options of [{},{},{},{role:'admin'},{role:'admin',adminScope:'primary'}]){const u=await createTestUser(options);users.push(u);agents.push(await loginStudent(u));}});
afterAll(async()=>{for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);});
const base='/api/v1/chat';
it('requires login and exposes only student names, not contact information',async()=>{
 expect((await request(app).get(base+'/rooms')).status).toBe(401);
 expect((await agents[0].get(base+'/students?q=x')).status).toBe(400);
 const found=await agents[0].get(base+'/students').query({q:users[1].username});expect(found.status).toBe(200);expect(found.body.data.map(u=>u.id)).toContain(users[1].id);expect(Object.keys(found.body.data[0]).sort()).toEqual(['avatar_key','display_name','id','username']);
 expect((await agents[3].post(base+'/rooms').send({kind:'direct',members:[users[0].id]})).status).toBe(403);
});
it('reuses direct rooms, authenticates membership, stores text and retries once',async()=>{
 const made=await agents[0].post(base+'/rooms').send({kind:'direct',members:[users[1].id]});expect(made.status).toBe(200);direct=made.body.data.id;
 expect((await agents[1].post(base+'/rooms').send({kind:'direct',members:[users[0].id]})).body.data.id).toBe(direct);
 expect((await agents[2].get(`${base}/rooms/${direct}/messages`)).status).toBe(404);
 expect((await agents[2].post(`${base}/rooms/${direct}/messages`).send({text:'intrusion',client_id:randomUUID()})).status).toBe(404);
 const body={text:'Cùng học nhé <script>alert(1)</script>',client_id:randomUUID()};
 message=(await agents[0].post(`${base}/rooms/${direct}/messages`).send(body)).body.data.id;
 expect((await agents[0].post(`${base}/rooms/${direct}/messages`).send(body)).body.data.id).toBe(message);
 let data=(await agents[1].get(`${base}/rooms/${direct}/messages`)).body.data;expect(data.items).toHaveLength(1);expect(data.items[0].body).toBe(body.text);
 expect((await agents[1].get(base+'/rooms')).body.data[0].unread).toBe(1);
 await agents[1].put(`${base}/rooms/${direct}/read`);expect((await agents[1].get(base+'/rooms')).body.data[0].unread).toBe(0);
 expect((await agents[1].delete(base+'/messages/'+message)).status).toBe(403);
});
it('blocks sending in both directions and supports unblocking',async()=>{
 expect((await agents[1].put(base+'/blocks/'+users[0].id)).status).toBe(200);
 for(const agent of [agents[0],agents[1]])expect((await agent.post(`${base}/rooms/${direct}/messages`).send({text:'blocked',client_id:randomUUID()})).status).toBe(403);
 expect((await agents[1].get(`${base}/rooms/${direct}/messages`)).body.data.items).toHaveLength(0);
 expect((await agents[0].post(base+'/rooms').send({kind:'direct',members:[users[1].id]})).status).toBe(403);
 await agents[1].delete(base+'/blocks/'+users[0].id);expect((await agents[1].get(`${base}/rooms/${direct}/messages`)).body.data.items).toHaveLength(1);
});
it('only members can report and only super admins can moderate reported messages',async()=>{
 expect((await agents[2].post(`${base}/messages/${message}/report`).send({reason:'not member'})).status).toBe(404);
 expect((await agents[1].post(`${base}/messages/${message}/report`).send({reason:'Kiểm tra báo cáo'})).status).toBe(200);
 expect((await agents[4].get(base+'/reports')).status).toBe(403);expect((await agents[0].get(base+'/reports')).status).toBe(403);
 reportId=(await agents[3].get(base+'/reports')).body.data.find(r=>r.message_id===message).id;
 expect((await agents[3].put(base+'/reports/'+reportId).send({action:'hide'})).status).toBe(200);
 const m=(await agents[1].get(`${base}/rooms/${direct}/messages`)).body.data.items[0];expect(m.hidden).toBe(1);expect(m.body).not.toContain('<script>');
});
it('manages groups, prevents non-owner changes, revokes removed users and transfers ownership on leave',async()=>{
 group=(await agents[0].post(base+'/rooms').send({kind:'group',title:'Nhóm ôn tập',members:[users[1].id]})).body.data.id;
 expect((await agents[1].put(`${base}/rooms/${group}/members`).send({action:'add',student_id:users[2].id})).status).toBe(403);
 expect((await agents[0].put(`${base}/rooms/${group}/members`).send({action:'add',student_id:users[2].id})).status).toBe(200);
 expect((await agents[2].get(`${base}/rooms/${group}/messages`)).status).toBe(200);
 await agents[0].put(`${base}/rooms/${group}/members`).send({action:'remove',student_id:users[2].id});
 expect((await agents[2].get(`${base}/rooms/${group}/messages`)).status).toBe(404);
 expect((await agents[2].post(`${base}/rooms/${group}/messages`).send({text:'removed',client_id:randomUUID()})).status).toBe(404);
 await agents[0].put(`${base}/rooms/${group}/members`).send({action:'leave'});
 const r=(await agents[1].get(base+'/rooms')).body.data.find(r=>r.id===group);expect(r.owner_id).toBe(users[1].id);
 expect((await agents[0].get(`${base}/rooms/${group}/messages`)).status).toBe(404);
 await agents[1].put(`${base}/rooms/${group}/members`).send({action:'leave'});
 expect(await query('SELECT id FROM chat_rooms WHERE id=?',[group])).toHaveLength(0);
});
