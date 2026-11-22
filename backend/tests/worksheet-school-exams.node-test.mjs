import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateSheet,gradeItem,publicItem,validateResponses} from '../src/services/worksheet-rules.js';
import {worksheetExamScore} from '../src/services/worksheet-exam-scoring.js';
const config={scoring:'school-points',period:'final2',semester:'hk2',duration_minutes:90};
const item=(type,points,answer,extra={})=>({id:randomUUID(),type,points,prompt:'Tính kết quả cuối cùng',explanation:'Lời giải chỉ hiện khi nộp',config:type==='true_false_group'?{statements:['Ý a','Ý b']}:{answer_format:'number'},answer,...extra});
const paper=items=>({title:'Đề Toán 6',grade:6,subject_id:'toan',status:'published',exam_config:config,items});
test('school papers retain the exact source weights and award each true/false statement independently',()=>{
 const items=[item('fill',7,{accepted:['1/2']}),item('true_false_group',3,{values:[true,false]})];const validated=validateSheet(paper(items));
 const results=validated.items.map((question,n)=>({id:question.id,...gradeItem(question,n===0?'2/4':[true,true])}));
 assert.deepEqual(worksheetExamScore(validated.items,results,config),{points:8.5,maximum:10,percent:85});
 assert.throws(()=>validateSheet(paper(items.map(({points,...question})=>question))));
 assert.throws(()=>validateSheet(paper([{...items[0],points:6},items[1]])));
 assert.throws(()=>validateSheet(paper([{...items[1],points:10,answer:{values:[true]}}])));
 assert.deepEqual(validateResponses(validated.items,{[items[1].id]:[true,null]})[items[1].id],[true,null]);
 assert.throws(()=>validateResponses(validated.items,{[items[1].id]:[true,false,true,false]}));
});
test('numeric final answers accept equivalent fractions, mixed numbers, units and local decimal notation',()=>{
 const fraction=item('word',10,{accepted:['-3/2']},{config:{answer_format:'number',unit:'cm²'}});
 for(const answer of ['-6/4','x = -1,5','-1 1/2','-1 1/2 cm²','−1,50 cm^2'])assert.equal(gradeItem(fraction,answer).correct,true,answer);
 for(const answer of ['3/2','-1/5','1/0','-1,5 m²',''])assert.equal(gradeItem(fraction,answer).correct,false,answer);
 const money=item('fill',10,{accepted:['5625000']});assert.equal(gradeItem(money,'5.625.000').correct,true);assert.equal(gradeItem(money,'5,625,000').correct,true);
 const precise=item('fill',10,{accepted:['1/3']});assert.equal(gradeItem(precise,'0,33').correct,false);
});
test('sets ignore member order while retaining the order inside coordinate pairs',()=>{
 const pairs=item('fill',10,{accepted:['{(0;6);(-2;-4);(4;2);(-6;0)}']},{config:{answer_format:'set'}});
 assert.equal(gradeItem(pairs,'S = {(4;2); (0;6); (-6;0); (-2;-4)}').correct,true);
 assert.equal(gradeItem(pairs,'{(2;4);(0;6);(-6;0);(-2;-4)}').correct,false);
 assert.equal(gradeItem(pairs,'{0;6;-2;-4;4;2;-6;0}').correct,false);
 assert.equal(gradeItem(pairs,'{(0;6);(-2;-4);(4;2)}').correct,false);
 const values=item('fill',10,{accepted:['{1;1/2;-3}']},{config:{answer_format:'set'}});assert.equal(gradeItem(values,'{-3;0,5;1;1}').correct,true);
});
test('public questions never include the essay answer or worked solution',()=>{
 const question=validateSheet(paper([item('fill',10,{accepted:['125']})])).items[0],exposed=publicItem(question);
 assert.equal(exposed.points,10);assert(!Object.hasOwn(exposed,'answer'));assert(!Object.hasOwn(exposed,'explanation'));
 assert.equal(gradeItem(question,'125').explanation,question.explanation);
});
