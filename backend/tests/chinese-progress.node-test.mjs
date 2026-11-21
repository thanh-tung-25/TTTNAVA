import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildChineseLessonProgress,legacyCoverage} from '../src/services/chinese-progress-model.js';
import {validateStudyProgress,validateStudyEvidence} from '../src/services/study-activity-source.js';

function fixture(){
 const vocabulary=Array.from({length:4},(_,n)=>({id:'w'+n,set_id:'set',kind:'vocabulary',active:1,data:{hanzi:['你','我','他','她'][n],pinyin:'p'+n,meaning:'Nghĩa '+n}}));
 const questions=Array.from({length:21},(_,n)=>({id:'q'+n,set_id:'set',kind:'question',active:1,data:{approved:true,type:'choice',prompt:'Câu hỏi '+n,accepted:['Đúng '+n],options:['Đúng '+n,'Sai'],explanation:'Giải thích',vocabulary_id:'w'+n%4}}));
 const spoken=Array.from({length:2},(_,n)=>({id:'s'+n,set_id:'set',kind:'dialogue',active:1,data:{practice:'speaking',speaking_selected:true,text:['你好吗？','你叫什么名字？'][n]}}));
 const tasks=['order','fix','fill','dialogue'].flatMap(type=>Array.from({length:3},(_,n)=>({type,prompt:type+' '+n,speech:'你好 '+n,answer:'đúng '+n,options:['đúng '+n,'sai']})));
 return {lesson:{id:'lesson',title:'Bài 1. Xin chào',level_id:1,position:1},sets:[{id:'set',lesson_id:'lesson',status:'published'}],items:[...vocabulary,...questions,...spoken,{id:'read',set_id:'set',kind:'reading',active:1,data:{text:'Bài đọc'}}],activities:[{lesson_id:'lesson',status:'published',data:{tasks}}],chatSettings:[{lesson_id:'lesson',data:{enabled:false}}],streetSettings:[{lesson_id:'lesson',data:{enabled:false,missions:[]}}]};
}
const result=input=>buildChineseLessonProgress(input);
const section=(model,id)=>model.groups.find(group=>group.id===id);
const mode=(model,id)=>model.groups.flatMap(group=>group.modes).find(row=>row.id===id);
const study=(activity,snapshot,result={},extra={})=>({course_id:'hsk-1',source_id:'set',activity,unit_key:'all',snapshot,result,...extra});
const complete={completed_at:'2026-11-20T00:00:00Z'};

test('quiz coverage survives editorial changes and unfinished history, without credit for blank or unconfirmed answers',()=>{
 const data=fixture(),old=structuredClone(data.items.filter(item=>item.kind==='question'));
 data.items.find(item=>item.id==='q0').data.options.reverse();data.items.find(item=>item.id==='q0').data.explanation='Giải thích mới';
 data.items.find(item=>item.id==='q1').data.prompt='Câu hoàn toàn khác';
 data.attempts=[{set_id:'set',snapshot:{items:old},answers:{q0:{locked:true,value:'Sai'},q1:{locked:true,value:'Đúng 1'},q2:{locked:false,value:'Đúng 2'},q3:{locked:true,value:' '}},abandoned_at:'2026-11-20'}];
 const model=result(data);assert.equal(mode(model,'quiz').done,1);assert.equal(model.olderContent,true);assert.equal(mode(model,'words').done,1);
});
test('repeating the same questions and vocabulary never adds coverage twice',()=>{
 const data=fixture(),attempt={set_id:'set',snapshot:{items:[data.items.find(item=>item.id==='q0')]},answers:{q0:{locked:true,value:'Sai'}}};
 data.attempts=[attempt,structuredClone(attempt)];data.reviews=[{item_id:'w0',review_count:50},{item_id:'w1',review_count:0}];
 const model=result(data);assert.equal(mode(model,'quiz').done,1);assert.equal(mode(model,'words').done,1);assert.deepEqual(model.studiedWordIds,['w0']);
});
test('old archived sources match current content by meaning within the same lesson',()=>{
 const data=fixture(),old=structuredClone(data.items.find(item=>item.id==='q0'));old.id='old-q';old.set_id='archived';
 const oldWord=structuredClone(data.items.find(item=>item.id==='w1'));oldWord.id='old-w';oldWord.set_id='archived';oldWord.active=0;
 data.sets.push({id:'archived',lesson_id:'lesson',status:'archived'});data.items.push(old,oldWord);data.reviews=[{item_id:'old-w',review_count:1}];
 data.attempts=[{set_id:'archived',snapshot:{items:[old]},answers:{'old-q':{locked:true,value:'Sai'}}}];
 const model=result(data);assert.equal(mode(model,'quiz').done,1);assert.equal(mode(model,'words').done,2);
});
test('other lessons and courses cannot grant coverage to this lesson',()=>{
 const data=fixture();data.items.push({id:'foreign',set_id:'elsewhere',kind:'vocabulary',data:{hanzi:'你',pinyin:'p0',meaning:'Nghĩa 0'}});
 data.reviews=[{item_id:'foreign',review_count:1}];data.studies=[study('words',{items:[{id:'w0'}]},{studied_items:['w0']},{course_id:'hsk-2'})];
 data.attempts=[{set_id:'elsewhere',snapshot:{items:[{...data.items.find(item=>item.id==='q0'),set_id:'elsewhere'}]},answers:{q0:{locked:true,value:'x'}}}];
 assert.equal(mode(result(data),'words').done,0);assert.equal(mode(result(data),'quiz').done,0);
});
test('words and cards share their vocabulary pool and do not double its weight',()=>{
 const data=fixture();data.studies=[study('cards',{items:[{id:'w0'},{id:'w1'}]},{studied_items:['w0','w1']})];
 const model=result(data);assert.equal(mode(model,'words').percent,50);assert.equal(mode(model,'cards').percent,50);assert.equal(section(model,'characters').percent,50);
});
test('legacy counts are conservative across duplicate source rows and repeated receipts',()=>{
 assert.equal(legacyCoverage(['a','a','b','c'],2),1);assert.equal(legacyCoverage([null,'a','b'],2),1);
 const data=fixture(),snapshot={items:data.items.filter(item=>item.kind==='vocabulary').map(item=>({id:item.id}))};
 data.studies=[study('words',snapshot,{completed:3},complete),study('cards',snapshot,{completed:2},complete),study('words',snapshot,{completed:3},complete)];
 const model=result(data);assert.equal(mode(model,'words').done,3);assert.equal(model.legacyIncluded,true);assert.deepEqual(model.studiedWordIds,[]);
 data.studies[0].result={completed:3,legacy_completed:3,studied_items:['w0']};assert.equal(mode(result(data),'words').done,3);
});
test('listening includes old completed stages and new partial answers, including wrong choices',()=>{
 const data=fixture();data.studies=[study('listening',{items:[{id:'w0',answer:'Nghĩa 0'},{id:'w1',answer:'Nghĩa 1'}]},{completed:2,correct:0},complete),study('listening',{items:[{id:'w1',answer:'Nghĩa 1'},{id:'w2',answer:'Nghĩa 2'}]},{studied_items:['w1','w2']})];
 const model=result(data);assert.equal(mode(model,'listening').done,3);assert.equal(mode(model,'listening').percent,75);
});
test('application partial coverage follows task content after task reordering',()=>{
 const data=fixture(),old=structuredClone(data.activities[0].data.tasks);data.activities[0].data.tasks.reverse();
 data.studies=[study('application',{items:old.map((task,n)=>({id:String(n),data:task}))},{studied_items:['0','3','6','9']})];
 const node=mode(result(data),'application');assert.equal(node.done,4);assert.deepEqual(node.children.map(child=>child.done),[1,1,1,1]);
});
test('typed legacy application receipts combine across types, mixed rounds use a lower bound',()=>{
 const data=fixture(),tasks=data.activities[0].data.tasks;
 const typed=type=>study('application',{items:tasks.filter(task=>task.type===type).map((task,n)=>({id:String(n),data:task}))},{completed:2},{...complete,unit_key:type});
 data.studies=[typed('order'),typed('order'),typed('fill'),study('application',{items:tasks.map((task,n)=>({id:String(n),data:task}))},{completed:3},complete)];
 const node=mode(result(data),'application');assert.equal(node.done,4);assert.deepEqual(node.children.map(child=>child.done),[2,0,2,0]);
});
test('reading history and study sessions deduplicate the same text',()=>{
 const data=fixture();data.progress=[{set_id:'set',read_items:['read']}];data.studies=[study('reading',{items:[{id:'read'}]},{completed:1},complete)];
 assert.equal(mode(result(data),'reading').done,1);
});
test('speaking uses answered questions from recordings and assessed clips without leaking transcripts',()=>{
 const data=fixture(),questions=data.items.filter(item=>item.data.practice==='speaking');
 data.studies=[study('recording',{items:questions.map((item,n)=>({id:String(n+1),text:item.data.text}))},{studied_items:['1']})];
 data.submissions=[{id:'submission',set_id:'set',snapshot:{questions:questions.map(item=>({question:item.data.text}))},result:{questions:[{question:questions[0].data.text,transcript:'PRIVATE SPEECH'}]}}];
 data.clips=[{submission_id:'submission',question_index:2,status:'completed',result:{transcript:'PRIVATE SPEECH'}}];
 const model=result(data);assert.equal(mode(model,'speaking').done,2);assert(!JSON.stringify(model).includes('PRIVATE SPEECH'));
});
test('chat uses the most complete real session, excludes previews and caps at twenty turns',()=>{
 const data=fixture();data.aiAvailable=true;data.chatSettings[0].data.enabled=true;data.chats=[{lesson_id:'lesson',turn_count:20,is_preview:1},{lesson_id:'lesson',turn_count:4,is_preview:0},{lesson_id:'lesson',turn_count:6,is_preview:0}];
 assert.equal(mode(result(data),'ai-chat').percent,30);data.chats.push({lesson_id:'lesson',turn_count:25,is_preview:0});assert.equal(mode(result(data),'ai-chat').percent,100);
 data.aiAvailable=false;assert.equal(mode(result(data),'ai-chat').available,false);
});
test('street progress requires completion and an unchanged mission fingerprint',()=>{
 const data=fixture(),missions=[{id:'a',title:'Một'},{id:'b',title:'Hai'}];data.streetSettings[0].data={enabled:true,missions};
 const hash=task=>createHash('sha256').update(JSON.stringify(task)).digest('hex');
 data.streetProgress=[{lesson_id:'lesson',mission_id:'a',content_hash:hash(missions[0]),...complete},{lesson_id:'lesson',mission_id:'b',content_hash:'old',...complete}];
 assert.equal(mode(result(data),'street').percent,50);
});
test('guided native learning runs contribute actual saved answers',()=>{
 const data=fixture();data.runs=[{course_id:'hsk-1',items_json:[{id:'w0'},{id:'q1',prompt:'Câu hỏi 1'},{id:'q2',prompt:'Câu hỏi 2'}],answers_json:{w0:{correct:false},q1:{correct:false}}}];
 assert.equal(mode(result(data),'quiz').done,1);assert.equal(mode(result(data),'words').done,2);
});
test('closed content is excluded, and empty lessons show unavailable rather than a misleading zero',()=>{
 const data=fixture();data.items=[];data.activities=[];const model=result(data);assert.equal(model.percent,null);assert(model.groups.every(group=>!group.available));
});
test('progress below full coverage cannot round up to one hundred',()=>{
 const data=fixture();data.items=Array.from({length:1001},(_,n)=>({id:'word'+n,set_id:'set',kind:'vocabulary',data:{hanzi:'字'+n,pinyin:'p',meaning:'m'}}));
 data.reviews=data.items.slice(0,-1).map(item=>({item_id:item.id,review_count:1}));assert.equal(section(result(data),'characters').percent,99);
});
test('reconciliation is read-only and deterministic for all source histories',()=>{
 const data=fixture();data.reviews=[{item_id:'w0',review_count:1}];data.studies=[study('words',{items:[{id:'w0'}]},{completed:1},complete)];
 const before=structuredClone(data),first=result(data);assert.deepEqual(data,before);assert.deepEqual(result(data),first);
});
test('partial progress accepts answered content without requiring a reward-sized round',()=>{
 const snapshot={kind:'listening',required:10,items:[{id:'w',answer:'Đúng'}],options:['Đúng','Sai']},evidence={items:[{id:'w',answer:'Sai'}]};
 assert.deepEqual(validateStudyProgress(snapshot,evidence,new Date()),['w']);assert.throws(()=>validateStudyEvidence(snapshot,evidence,new Date()));
 assert.throws(()=>validateStudyProgress(snapshot,{items:[{id:'forged',answer:'Đúng'}]},new Date()));assert.throws(()=>validateStudyProgress(snapshot,{items:[{id:'w',answer:'Unknown'}]},new Date()));
});
test('partial progress rejects duplicate IDs, invalid task choices, and recordings without elapsed recording time',()=>{
 const view={kind:'view',items:[{id:'w'}]};assert.throws(()=>validateStudyProgress(view,{items:[{id:'w'},{id:'w'}]},new Date()));
 assert.throws(()=>validateStudyProgress({kind:'application',items:[{id:'0',data:{type:'dialogue',options:['a','b']}}]},{items:[{id:'0',answer:'c'}]},new Date()));
 const recording={kind:'recording',items:[{id:'1'}]},evidence={items:[{id:'1'}],duration:5};assert.throws(()=>validateStudyProgress(recording,evidence,new Date()));
 assert.deepEqual(validateStudyProgress(recording,evidence,new Date(Date.now()-6000)),['1']);
});
