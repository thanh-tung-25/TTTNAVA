import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {extractDocxQuestions} from '../src/services/docx-import-service.js';
import {validateSheet,gradeItem} from '../src/services/worksheet-rules.js';
import {worksheetItemsFromWord} from '../../frontend/assets/js/worksheet-word-import.js';
import {paperFromWord} from '../../frontend/assets/js/admin-school-paper-word.js';

const scope={grade:12,subjectId:'hoa-hoc',lessonId:'must-not-attach',period:'all'},meta={title:'Đề từ Word',durationMinutes:45,period:'final2'};
test('the multiple-choice Word template reads Vietnamese questions and saves in the selected exam scope',async()=>{
 const parsed=await extractDocxQuestions(await readFile(new URL('../../frontend/assets/templates/mau-de-thi-trac-nghiem.docx',import.meta.url)));
 assert.equal(parsed.questions.length,3);assert(parsed.questions.every(q=>q.type==='single_choice'&&q.options.length===4));
 assert.deepEqual(parsed.questions.map(q=>q.answer.key),['b','c','c']);assert.match(parsed.questions[0].prompt,/Kết quả/);
 const paper=validateSheet(paperFromWord(scope,worksheetItemsFromWord(parsed),meta));
 assert.equal(paper.grade,12);assert.equal(paper.subject_id,'hoa-hoc');assert.equal(paper.lesson_id,null);assert.equal(paper.status,'draft');assert.equal(paper.exam_config.period,'final2');assert.equal(paper.exam_config.semester,'hk2');assert.equal(paper.exam_config.duration_minutes,45);
 assert.equal(validateSheet({...paper,status:'published'}).items.length,3);assert.equal(gradeItem(paper.items[0],1).correct,true);
});
test('Word exams retain missing answers as drafts and share exactly ten points across any supported length',()=>{
 const item={id:randomUUID(),type:'choice',prompt:'Choose',config:{options:['A','B']},answer:{index:1},explanation:'',imageId:null};
 for(const count of [1,3,30,40,50]){const items=Array.from({length:count},()=>({...item,id:randomUUID()})),paper=paperFromWord(scope,items,meta);assert(Math.abs(paper.items.reduce((n,q)=>n+q.points,0)-10)<1e-9);validateSheet({...paper,status:'published'});assert.equal(items[0].points,undefined);}
 const draft=paperFromWord(scope,[{...item,answer:null}],meta);assert.equal(validateSheet(draft).items[0].answer,null);assert.throws(()=>validateSheet({...draft,status:'published'}),/đáp án/);
});
test('Word exam creation requires a real period and never silently truncates question count',()=>{
 assert.throws(()=>paperFromWord(scope,[],meta));assert.throws(()=>paperFromWord(scope,[{}],{...meta,period:'all'}));assert.throws(()=>paperFromWord(scope,Array(51).fill({}),meta));
});
