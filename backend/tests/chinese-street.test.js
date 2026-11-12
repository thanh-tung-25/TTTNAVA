import {beforeAll,afterAll,afterEach,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';
import {streetMissionBank,defaultStreetLesson} from '../src/data/chinese-street-missions.js';
import {streetSettingsSchema} from '../src/services/chinese-street.js';
import {streetPlaces} from '../../frontend/assets/js/chinese-street-places.js';
const base='/api/v1/chinese/street',users=[];
let admin,student,other,locked,primary,lesson,draft;
const detail=async(agent=student,id=lesson)=>{const r=await agent.get(base+'/lessons/'+id);expect(r.status).toBe(200);return r.body.data;};
const answer=(task,choice_id,request_id=randomUUID(),agent=student)=>agent.post(`${base}/lessons/${lesson}/missions/${task.id}/answers`).send({choice_id,request_id,content_hash:task.content_hash});
const payload=data=>({revision:data.revision,enabled:data.enabled,place_id:data.place_id,missions:data.missions.map(({id,title,instruction,speech,type,options,answer,feedback})=>({id,title,instruction,speech,type,options,answer,feedback}))});
beforeAll(async()=>{
 for(const opts of [{role:'admin',adminScope:'chinese'},{grade:null},{grade:null},{grade:null,enrolled:false},{role:'admin',adminScope:'primary'}])users.push(await createTestUser(opts));
 [admin,student,other,locked,primary]=await Promise.all(users.map(loginStudent));
 for(const status of ['published','draft']){const r=await admin.post('/api/v1/chinese/lessons').send({level_id:1,title:'Bài 7. Phố thử '+status,position:7,status});expect(r.status).toBe(200);if(status==='published')lesson=r.body.data.id;else draft=r.body.data.id;}
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Street must not call an external provider');}));
});
afterEach(async()=>{
 await query('DELETE FROM chinese_street_lessons WHERE lesson_id IN (?,?)',[lesson,draft]);
 for(const u of users)await query('DELETE FROM chinese_street_progress WHERE student_id=?',[u.id]);
});
afterAll(async()=>{vi.unstubAllGlobals();for(const id of [lesson,draft])if(id)await admin.delete('/api/v1/chinese/lessons/'+id);for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);});
it('authors thirty valid missions across ten lessons with unique options and consistent map directions',()=>{
 expect(streetMissionBank).toHaveLength(10);expect(streetMissionBank.flatMap(l=>l.missions)).toHaveLength(30);
 for(const l of streetMissionBank){const config=defaultStreetLesson({level_id:1,title:'Bài '+l.number,position:l.number});expect(streetSettingsSchema.safeParse({...config,revision:0}).success).toBe(true);}
 expect(defaultStreetLesson({level_id:2,title:'Bài 1',position:1})).toBeNull();
 const adjacent=(left,right)=>{const a=streetPlaces.findIndex(p=>p.id===left),b=streetPlaces.findIndex(p=>p.id===right);expect(b).toBe(a+1);expect(a%2).toBe(0);};
 adjacent('restaurant','bank');adjacent('office','bakery');adjacent('cinema','home');
});
it('checks enrollment and admin scope and never exposes solutions before an answer',async()=>{
 expect((await locked.get(base+'?level=1')).status).toBe(403);expect((await primary.get(base+'?level=1')).status).toBe(403);
 const s=await detail();expect(s.missions).toHaveLength(3);expect(s.missions[0]).not.toHaveProperty('answer');expect(s.missions[0]).not.toHaveProperty('feedback');
 const teacher=await detail(admin);expect(teacher.missions[0].answer).toBe('bank');
 expect((await student.put(base+'/lessons/'+lesson).send(payload(teacher))).status).toBe(403);expect((await student.get(base+'/results?level=1')).status).toBe(403);
 expect((await answer(s.missions[0],'bank',randomUUID(),admin)).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
});
it('previews draft lessons for teachers and hides them from students',async()=>{
 expect((await admin.get(base+'/lessons/'+draft)).status).toBe(200);expect((await student.get(base+'/lessons/'+draft)).status).toBe(404);
 const catalog=(await student.get(base+'?level=1')).body.data;expect(catalog.lessons.some(l=>l.id===draft)).toBe(false);expect(catalog.lessons.find(l=>l.id===lesson)).toMatchObject({total:3,completed:0,stars:0});
});
it('keeps a repeated wrong request idempotent and gives two stars after a correction',async()=>{
 const task=(await detail()).missions[0],rid=randomUUID();
 const first=await answer(task,'home',rid);expect(first.status).toBe(200);expect(first.body.data).toMatchObject({correct:false,wrong_count:1,stars:0});expect(first.body.data).not.toHaveProperty('answer_id');expect(first.body.data.feedback).not.toContain('右边');
 expect((await answer(task,'home',rid)).body.data.wrong_count).toBe(1);expect((await answer(task,'bank',rid)).status).toBe(409);
 const right=await answer(task,'bank');expect(right.body.data).toMatchObject({correct:true,completed:true,stars:2,wrong_count:1,answer_id:'bank'});
 expect((await answer(task,'home')).body.data).toMatchObject({correct:false,completed:true,stars:2,wrong_count:1});
 const again=(await detail()).missions[0];expect(again.progress).toEqual({completed:true,stars:2,wrong_count:1});
});
it('serializes concurrent duplicate submissions and preserves independent student progress',async()=>{
 const task=(await detail()).missions[0],rid=randomUUID();const responses=await Promise.all([answer(task,'bank',rid),answer(task,'bank',rid)]);expect(responses.map(r=>r.status)).toEqual([200,200]);
 const [row]=await query('SELECT COUNT(*) total FROM chinese_street_progress WHERE student_id=?',[users[1].id]);expect(Number(row.total)).toBe(1);
 expect((await detail(other)).missions[0].progress.stars).toBe(0);expect((await detail()).missions[0].progress.stars).toBe(3);
});
it('rejects answers after enrollment is revoked and validates mission/choice IDs',async()=>{
 const task=(await detail()).missions[0];expect((await answer(task,'not-a-place')).status).toBe(400);
 expect((await answer({...task,id:'missing'},'bank')).status).toBe(404);
 expect((await answer(task,'bank',randomUUID(),locked)).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
});
it('validates teacher choices and prevents conflicting edits',async()=>{
 const original=await detail(admin),p=payload(original);p.missions[0]={...p.missions[0],type:'choice',options:[{id:'a',label:'你好！'},{id:'b',label:'再见！'}],answer:'a'};
 expect((await admin.put(base+'/lessons/'+lesson).send(p)).status).toBe(200);
 expect((await admin.put(base+'/lessons/'+lesson).send(p)).status).toBe(409);
 const saved=payload(await detail(admin));saved.missions[0].options[1].label='你好！';expect((await admin.put(base+'/lessons/'+lesson).send(saved)).status).toBe(400);
 saved.missions[0].options[1].label='再见！';saved.missions[0].speech='Only English';expect((await admin.put(base+'/lessons/'+lesson).send(saved)).status).toBe(400);
});
it('tracks content versions, rejects stale questions and preserves the previous progress row',async()=>{
 const old=(await detail()).missions[0];await answer(old,'bank');
 const config=payload(await detail(admin));config.missions[0].speech='请问，中国银行在哪儿？';expect((await admin.put(base+'/lessons/'+lesson).send(config)).status).toBe(200);
 expect((await answer(old,'bank')).body.error.code).toBe('STREET_CONTENT_CHANGED');
 const task=(await detail()).missions[0];expect(task.progress.stars).toBe(0);await answer(task,'bank');
 const [rows]=await query('SELECT COUNT(*) total FROM chinese_street_progress WHERE student_id=? AND lesson_id=?',[users[1].id,lesson]);expect(Number(rows.total)).toBe(2);
 const report=(await admin.get(base+'/results?level=1')).body.data.find(r=>r.student_id===users[1].id&&r.lesson_id===lesson);expect(report).toMatchObject({completed:1,total:3,stars:3,wrong_count:0});
});
it('supports teacher pause and gives a truthful empty state for other levels',async()=>{
 const config=payload(await detail(admin));config.enabled=false;expect((await admin.put(base+'/lessons/'+lesson).send(config)).status).toBe(200);
 expect((await student.get(base+'/lessons/'+lesson)).status).toBe(404);expect((await admin.get(base+'/lessons/'+lesson)).status).toBe(200);
 expect((await student.get(base+'?level=9')).status).toBe(200);expect((await student.get(base+'?level=10')).status).toBe(400);
});
