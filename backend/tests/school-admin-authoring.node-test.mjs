import {test} from 'node:test';import assert from 'node:assert/strict';
import {guideRevision,visibleGuideContent,parseGuideAuthoring,mergeGuideContent,createSchoolGuideWriter} from '../src/services/school-guide-authoring.js';
import {worksheetItemsFromWord} from '../../frontend/assets/js/worksheet-word-import.js';
import {schoolAdminDestination,scopeForSchoolGroup} from '../../frontend/assets/js/admin-school-context.js';
import {readFile} from 'node:fs/promises';
import {extractDocxQuestions} from '../src/services/docx-import-service.js';
const empty={summary:[],formulas:[],mistakes:[],examples:[]};
test('guide editing preserves private content and source data while exposing only learning sections',()=>{
 const raw={...empty,questions:[{answer:'private'}],source:{name:'original'}},copy=structuredClone(raw),{content}=parseGuideAuthoring({...empty,summary:[{heading:'Quy tắc',body:'Nội dung'}]},'published');
 const merged=mergeGuideContent(raw,content);assert.deepEqual(raw,copy);assert.deepEqual(merged.questions,raw.questions);assert.deepEqual(merged.source,raw.source);assert(!Object.hasOwn(visibleGuideContent(merged),'questions'));assert(!Object.hasOwn(visibleGuideContent(merged),'source'));
});
test('empty drafts and independent lesson sections can be saved without publishing empty or invalid content',()=>{
 assert.deepEqual(parseGuideAuthoring({...empty,status:'draft',expected_revision:null},'draft').content,empty);
 assert.throws(()=>parseGuideAuthoring(empty,'published'));
 assert.throws(()=>parseGuideAuthoring({...empty,summary:[{heading:'',body:'Nội dung'}]},'published'));
 assert.equal(parseGuideAuthoring({...empty,examples:[{prompt:'2+3',solution:'5'}]},'published').content.examples.length,1);
 const a={content_json:{...empty,other:{a:1,b:2}},status:'draft'},b={content_json:{other:{b:2,a:1},examples:[],mistakes:[],formulas:[],summary:[]},status:'draft'};
 assert.equal(guideRevision(a),guideRevision(b));assert.notEqual(guideRevision(a),guideRevision({...a,status:'published'}));
});
test('Word preview retains missing keys and rejects unsupported answer semantics or oversized imports',()=>{
 const choice={sourceNumber:1,type:'single_choice',prompt:'Chọn số',options:[{key:'a',text:'1'},{key:'b',text:'2'}],answer:null};
 assert.equal(worksheetItemsFromWord({questions:[choice]})[0].answer,null);
 const parsed=worksheetItemsFromWord({questions:[{...choice,answer:{key:'b'}},{sourceNumber:2,type:'fill_in',prompt:'Tính',answer:{accepted:['1/2']}}]});assert.equal(parsed[0].answer.index,1);assert.equal(parsed[1].type,'fill');
 assert.throws(()=>worksheetItemsFromWord({questions:[{...choice,type:'multiple_choice',answer:{keys:['a','b']}}]}));
 assert.throws(()=>worksheetItemsFromWord({questions:[{...choice,type:'true_false',answer:{value:true}}]}));
 assert.equal(worksheetItemsFromWord({questions:[{...choice,type:'true_false',answer:{value:true}}]},{scoring:'school-points'})[0].config.statements.length,1);
 assert.throws(()=>worksheetItemsFromWord({questions:[choice]},{existingCount:50}));assert.throws(()=>worksheetItemsFromWord({questions:[{...choice,prompt:'a'.repeat(3001)}]}));
});
test('student destination names and merged Unit question placement stay explicit',()=>{
 assert.equal(schoolAdminDestination({grade:12,subjectId:'toan',mode:'papers',period:'midterm1',title:'Đề A'}),'Lớp 12 → Toán → Đề thi → Giữa kì I → Đề A');
 assert.equal(schoolAdminDestination({grade:6,subjectId:'tieng-viet',mode:'papers',period:'all'}),'Lớp 6 → Ngữ văn → Đề thi');
 const group={id:'unit1',grade:12,subjectId:'tieng-anh',semester:'hk1',chapterId:'unit1',parts:[{id:'read',topicId:'read-t'},{id:'write',topicId:'write-t'}]};
 const target=scopeForSchoolGroup({yearId:'2026'},group,'write');assert.equal(target.groupId,'unit1');assert.equal(target.lessonId,'write');assert.equal(target.topicId,'write-t');assert.equal(target.yearId,'2026');
});
test('the downloadable exam Word template is readable by the actual importer',async()=>{
 const data=await extractDocxQuestions(await readFile(new URL('../../frontend/assets/templates/mau-nhap-de-thi.docx',import.meta.url)),'mau-nhap-de-thi.docx');
 assert.equal(data.questions.length,2);assert.equal(data.questions[0].type,'single_choice');assert.equal(data.questions[0].answer.key,'b');assert.equal(data.questions[1].type,'fill_in');assert.equal(worksheetItemsFromWord(data).length,2);
});
test('guide writes require admin scope resolution and never update private fields or a stale revision',async()=>{
 let row={content_json:{...empty,questions:[{answer:'keep'}],source:'keep'},status:'published'},resolved=false;const writes=[];
 const save=createSchoolGuideWriter({resolveGroup:async(user,course,id,year)=>{resolved=true;assert.equal(year,'2026');if(user.adminScope==='primary')throw Object.assign(Error('outside scope'),{code:'ADMIN_SCOPE_FORBIDDEN'});},withTransaction:async work=>work({query:async(sql,values)=>{if(sql.startsWith('SELECT id FROM courses'))return [[{id:'grade-12'}]];if(sql.startsWith('SELECT content_json'))return [[row]];writes.push({sql,values});row={content_json:JSON.parse(values[0]),status:values[1]};return [{affectedRows:1}];}})});
 await assert.rejects(()=>save({role:'student'},'grade-12','g',empty,'2026'));assert.equal(resolved,false);
 await assert.rejects(()=>save({role:'admin',adminScope:'primary'},'grade-12','g',empty,'2026'),{code:'ADMIN_SCOPE_FORBIDDEN'});assert.equal(writes.length,0);
 const user={role:'admin',adminScope:'super'},revision=guideRevision(row);await save(user,'grade-12','g',{...empty,summary:[{heading:'A',body:'B'}],expected_revision:revision},'2026');
 assert.deepEqual(row.content_json.questions,[{answer:'keep'}]);assert.equal(row.content_json.source,'keep');assert(!writes[0].sql.includes('source_sha256'));const count=writes.length;
 await assert.rejects(()=>save(user,'grade-12','g',{...empty,status:'draft',expected_revision:revision},'2026'),{code:'GUIDE_CHANGED'});assert.equal(writes.length,count);
});
