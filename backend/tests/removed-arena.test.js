import {beforeAll,afterAll,it,expect} from 'vitest';
import {access,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';
import {studentNavigation} from '../../frontend/assets/js/student-navigation.js';

let user,client;
beforeAll(async()=>{user=await createTestUser();client=await loginStudent(user);});
afterAll(async()=>{if(user)await query('DELETE FROM profiles WHERE id=?',[user.id]);});
it('opens the correct exam page from the primary navigation for every program',()=>{
 for(const kind of ['primary','secondary','chinese']){
  const nav=studentNavigation('exam',{course:{kind}}),href=kind==='chinese'?'/pages/student/chinese/?view=tests':'/pages/student/exam/';
  expect(nav).toContain(`href="${href}" aria-current="page"`);expect(nav).toContain('Bài kiểm tra');expect(nav).toContain('nav-exam-main');expect(nav).not.toMatch(/Thử sức|arena|challenge/);
 }
});
it('has no game routes, including direct requests from an old browser tab',async()=>{
 for(const [method,path]of [['get','/challenges/lobby'],['post','/challenges/robot'],['post','/challenges/invites'],['get','/challenges/'+randomUUID()],['post','/challenges/'+randomUUID()+'/answers'],['get','/experience/duels'],['post','/experience/duels'],['post','/experience/duels/'+randomUUID()+'/respond']]){
  const r=await client[method]('/api/v1'+path).set('X-Course-Id','grade-3').send(method==='post'?{}:undefined);expect(r.status,path).toBe(404);
 }
 const weekly=await client.post('/api/v1/experience/runs').set('X-Course-Id','grade-3').send({kind:'weekend'});expect(weekly.status).toBe(400);
 const [runs]=await query('SELECT COUNT(*) total FROM learning_runs WHERE profile_id=?',[user.id]);expect(Number(runs.total)).toBe(0);
});
it('physically removes the old pages and game implementation files',async()=>{
 for(const file of ['frontend/pages/student/arena/index.html','frontend/pages/student/challenge/index.html','frontend/assets/js/experience-arena.js','frontend/assets/js/challenge.js','backend/src/routes/challenge.js','backend/src/services/challenge-actions.js','backend/src/services/challenge-robot.js'])await expect(access(new URL('../../'+file,import.meta.url))).rejects.toThrow();
 for(const file of ['challenge.js','challenge-lobby.js','experience-arena.js'])await expect(access(new URL('../../public/assets/js/'+file,import.meta.url))).rejects.toThrow();
 const route=await readFile(new URL('../src/routes/student-experience.js',import.meta.url),'utf8');expect(route).not.toContain('/duels');
});
it('keeps school and Chinese exam endpoints available',async()=>{
 const school=await client.post('/api/v1/exams').send({topicId:'toan-3-do-luong'});expect(school.status).toBe(409);expect(school.body.error.code).toBe('TOPIC_EMPTY');
 const chinese=await client.get('/api/v1/chinese/tests');expect(chinese.status).toBe(200);expect(Array.isArray(chinese.body.data)).toBe(true);
});
