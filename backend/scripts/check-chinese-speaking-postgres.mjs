// Exercise real service queries in one transaction, then roll back every fixture.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {query,withTransaction,closePool,isPostgres} from '../src/config/db.js';
import {saveLesson,saveSet,detail,catalog} from '../src/services/chinese.js';
import {createSet} from '../src/services/chinese-manage.js';
const rollback=Symbol('rollback-speaking-check');let lessonId,setId;
try{
 if(!isPostgres)throw Error('This check requires PostgreSQL.');
 try{await withTransaction(async()=>{
  lessonId=(await saveLesson(null,{level_id:9,title:'Speaking rollback verification',position:99999,status:'published'})).id;
  setId=(await createSet({lesson_id:lessonId,title:'Speaking rollback verification'})).id;
  const items=Array.from({length:5},(_,n)=>({kind:'dialogue',data:{practice:'speaking',speaking_selected:n===1||n===4,text:`你有${n+1}个朋友吗？`,meaning:'Teacher-only meaning'}}));
  const settings={duration_seconds:120,order:'free'};
  await saveSet(setId,{title:'Speaking rollback verification',status:'published',speaking_settings:settings,items});
  const student=randomUUID(),publicData=await detail(setId,false,student);assert.deepEqual(publicData.set.speaking_settings,settings);assert.equal(publicData.items.length,2);assert.ok(publicData.items.every(i=>i.data.meaning===undefined));
  const data=await catalog(false,student);assert.equal(data.sets.find(s=>s.id===setId).speaking_count,2);assert.equal(Number(data.counts.find(c=>c.set_id===setId).speaking_total),5);
  const authored=await detail(setId,true,student);await saveSet(setId,{title:'Speaking rollback verification',status:'published',items:authored.items});assert.deepEqual((await detail(setId,true,student)).set.speaking_settings,settings);
  throw rollback;
 });}catch(error){if(error!==rollback)throw error;}
 assert.deepEqual(await query('SELECT id FROM chinese_sets WHERE id=?',[setId]),[]);assert.deepEqual(await query('SELECT id FROM chinese_lessons WHERE id=?',[lessonId]),[]);
 console.log(JSON.stringify({ready:true,settings_saved:true,selection_filtered:true,catalog_counts:true,other_section_preserved:true,fixtures_rolled_back:true}));
}catch(error){console.error(JSON.stringify({ready:false,error:error.message}));process.exitCode=1;}finally{await closePool();}
