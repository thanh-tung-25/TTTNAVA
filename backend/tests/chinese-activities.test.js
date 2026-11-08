import {beforeAll,afterAll,it,expect} from 'vitest';
import {createTestUser,loginStudent} from './helpers/index.js';
import {query} from '../src/config/db.js';
import {validateActivities} from '../src/services/chinese-activities.js';
import {activityTemplate} from '../../frontend/assets/js/chinese-activity-templates.js';

let admin,student,restricted,locked,lesson,set;const users=[];
const base='/api/v1/chinese';
const fill={type:'fill',prompt:'我___名片。',answer:'没有',hint:'Phủ định của 有',explanation:'有 phủ định bằng 没有.'};
beforeAll(async()=>{
 for(const options of [{role:'admin'},{role:'student'},{role:'admin',adminScope:'primary'},{role:'student',enrolled:false}])users.push(await createTestUser(options));
 [admin,student,restricted,locked]=await Promise.all(users.map(loginStudent));
 lesson=(await admin.post(base+'/lessons').send({title:'Activities test',level_id:1,position:1,status:'published'})).body.data.id;
 set=(await admin.post(base+'/sets').send({lesson_id:lesson,title:'Activities set'})).body.data.id;
 await admin.put(base+'/sets/'+set).send({title:'Activities set',status:'published',items:[{kind:'vocabulary',data:{hanzi:'有',meaning:'có'}}]});
});
afterAll(async()=>{if(lesson)await admin.delete(base+'/lessons/'+lesson);for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);});
it('only Chinese admins can author or preview activities',async()=>{
 expect((await admin.get('/assets/js/chinese-applied-practice.js')).status).toBe(200);
 const url=`${base}/lessons/${lesson}/activities`;
 for(const user of [student,restricted]){
  expect((await user.get(url)).status).toBe(403);
  expect((await user.put(url).send({})).status).toBe(403);
  expect((await user.post(url+'/preview').send({})).status).toBe(403);
 }
 expect((await admin.get(url)).body.data).toMatchObject({status:'draft',revision:0,tasks:[]});
});
it('validates all Q1 templates and rejects incorrect or oversized publication data',()=>{
 expect(activityTemplate({level_id:1,title:'Bài 1 . Xin Chào'}).topic).toBe('Chào hỏi');
 expect(activityTemplate({level_id:1,title:'Bài 2 . Hỏi tên, Hỏi họ, Quốc tịch,'}).topic).toBe('Làm quen');
 expect(activityTemplate({level_id:1,title:'Bài 1 chưa rõ nội dung'})).toBeNull();
 for(const title of ['你好','你叫什么名字','很高兴认识你','你去哪儿','你要吃什么','你在哪儿工作'])expect(validateActivities({...activityTemplate({level_id:1,title}),status:'published',revision:0}).tasks).toHaveLength(7);
 const valid={revision:0,status:'published',topic:'Test',tasks:[fill]};
 for(const patch of [
  {tasks:[]},{topic:''},{tasks:[{...fill,answer:''}]},{tasks:[{...fill,type:'fix',options:['没有',' 没有 ']}]},
  {tasks:[{...fill,type:'fix',options:['有','不']}]},{tasks:[{...fill,type:'dialogue',speech:'',options:['没有','有']}]},
  {tasks:[{...fill,type:'order',tokens:['有','没']}]},{tasks:Array(101).fill(fill)}
 ])expect(()=>validateActivities({...valid,...patch})).toThrow();
});
it('saves incomplete drafts without leaking them, previews without saving, publishes and withdraws',async()=>{
 const url=`${base}/lessons/${lesson}/activities`;
 expect((await admin.put(url).send({revision:0,status:'draft',topic:'Draft',tasks:[{type:'fill',prompt:'unfinished'}]})).status).toBe(200);
 expect((await student.get(base+'/sets/'+set)).body.data.activities).toBeNull();
 const pack={revision:1,status:'published',topic:'From admin',tasks:[fill]};
 expect((await admin.post(url+'/preview').send(pack)).status).toBe(200);
 expect((await admin.get(url)).body.data.revision).toBe(1);
 const saved=await admin.put(url).send(pack);expect(saved.status).toBe(200);expect(saved.body.data.revision).toBe(2);
 expect((await admin.put(url).send(pack)).status).toBe(409);
 expect((await student.get(base+'/sets/'+set)).body.data.activities.tasks[0]).toMatchObject(fill);
 expect((await student.get(base+'/catalog')).body.data.sets.find(s=>s.id===set).activity_count).toBe(1);
 expect((await locked.get(base+'/sets/'+set)).status).toBe(403);
 await admin.put(base+'/lessons/'+lesson).send({title:'Activities test',level_id:1,position:1,status:'draft'});
 expect((await student.get(base+'/sets/'+set)).status).toBe(404);
 await admin.put(base+'/lessons/'+lesson).send({title:'Activities test',level_id:1,position:1,status:'published'});
 expect((await admin.put(url).send({...pack,revision:2,status:'draft'})).status).toBe(200);
 expect((await student.get(base+'/sets/'+set)).body.data.activities).toBeNull();
 expect((await student.get(base+'/catalog')).body.data.sets.find(s=>s.id===set).activity_count).toBe(0);
});
it('removes the pack when its lesson is deleted',async()=>{
 expect((await admin.delete(base+'/lessons/'+lesson)).status).toBe(200);
 expect(await query('SELECT lesson_id FROM chinese_activities WHERE lesson_id=?',[lesson])).toHaveLength(0);
 expect((await admin.get(`${base}/lessons/${lesson}/activities`)).status).toBe(404);lesson=null;
});
