import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateSheet,gradeItem,publicItem,validateResponses} from '../src/services/worksheet-rules.js';
import {worksheetExamScore} from '../src/services/worksheet-exam-scoring.js';
const tf=()=>({id:randomUUID(),type:'true_false_group',prompt:'Xét bốn phát biểu',explanation:'Lời giải',config:{statements:['a','b','c','d']},answer:{values:[true,false,true,false]}});
const config={duration_minutes:50,semester:'hk1',scoring:'thpt-2025',short_points:.25};
const paper=items=>({title:'Đề thi nhập tay',grade:12,subject_id:'hoa-hoc',status:'published',exam_config:config,items});
test('all five true/false partial-credit levels are graded correctly',()=>{
 const item=tf();for(let correct=0;correct<=4;correct++){const value=item.answer.values.map((answer,index)=>index<correct?answer:!answer),result={id:item.id,...gradeItem(item,value)},score=worksheetExamScore([item],[result],config);assert.equal(score.points,[0,.1,.25,.5,1][correct]);}
 assert.equal(gradeItem(item,undefined).correct,false);assert.deepEqual(gradeItem(item,[null,null,null,null]).checks,[false,false,false,false]);
});
test('drafts preserve partially entered answer keys and publication rejects missing answers',()=>{
 const item=tf();item.answer.values=[true,null,false,null];assert.deepEqual(validateSheet({...paper([item]),status:'draft'}).items[0].answer.values,[true,null,false,null]);assert.throws(()=>validateSheet(paper([item])));item.answer=null;assert.equal(validateSheet({...paper([item]),status:'draft'}).items[0].answer,null);assert.throws(()=>validateSheet(paper([item])));
});
test('submitted response values cannot supply or overwrite the answer key',()=>{
 const item=tf();assert.deepEqual(validateResponses([item],{[item.id]:[true,false,null,true]})[item.id],[true,false,null,true]);assert.throws(()=>validateResponses([item],{[item.id]:['true',false,true,false]}));assert.throws(()=>validateResponses([item],{[randomUUID()]:[true,false,true,false]}));
 const exposed=publicItem({...item,review_note:'Private answer explanation'});assert(!('answer' in exposed));assert(!('explanation' in exposed));assert(!('review_note' in exposed));
});
test('choice allows explicitly reviewed multiple accepted options but rejects unrelated options',()=>{
 const item={id:randomUUID(),type:'choice',prompt:'Chọn đáp án',config:{options:['A','B','C','D']},answer:{index:0,acceptedIndices:[0,1]}};validateSheet(paper([item]));assert(gradeItem(item,0).correct);assert(gradeItem(item,1).correct);assert(!gradeItem(item,2).correct);assert.throws(()=>validateSheet(paper([{...item,answer:{index:0,acceptedIndices:[5]}}])));
});
test('excluded source errors do not send papers for manual grading or penalize the score',()=>{
 const item={...tf(),grading:'excluded',review_note:'Thiếu dữ kiện',answer:null},result=gradeItem(item,[true,false,true,false]);assert(result.excluded);assert.equal(worksheetExamScore([item],[{id:item.id,...result}]).maximum,0);assert.equal(validateSheet(paper([item])).items[0].grading,'excluded');assert.throws(()=>validateSheet(paper([{...item,review_note:''}])));
});
test('numeric short answers accept decimal comma, decimal point and harmless zero formatting',()=>{
 const item={id:randomUUID(),type:'fill',prompt:'Tính kết quả',config:{},answer:{accepted:['30,9']}};for(const answer of ['30.9','30,90','030.900'])assert(gradeItem(item,answer).correct);assert(!gradeItem(item,'309').correct);
});
test('three short questions in paper six can each carry half a point',()=>{
 const choices=Array.from({length:18},()=>({id:randomUUID(),type:'choice'})),trueFalse=Array.from({length:4},()=>({id:randomUUID(),type:'true_false_group'})),short=Array.from({length:3},()=>({id:randomUUID(),type:'fill'})),items=[...choices,...trueFalse,...short],results=items.map(item=>({id:item.id,correct:true,checks:[true,true,true,true]}));
 assert.deepEqual(worksheetExamScore(items,results,{short_points:.5}),{points:10,maximum:10,percent:100});
});
