import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {canonicalWorksheetExpression,worksheetExpressionMatches} from '../src/services/worksheet-expression-matching.js';
import {worksheetAnswerMatches} from '../src/services/worksheet-answer-matching.js';
import {validateSheet,gradeItem,publicItem} from '../src/services/worksheet-rules.js';
import {worksheetExamScore} from '../src/services/worksheet-exam-scoring.js';
import {requireSolutionImageSubmission,snapshotIncludesSolution} from '../src/services/worksheet-solution-access.js';

test('algebra answers accept exact equivalent notation and periodic solution families',()=>{
 for(const [left,right] of [['2sqrt(2)','sqrt(8)'],['x²+2x+1','(x+1)^2'],['\\frac{1}{2}','0.5'],['π/3+kπ','4π/3+kπ'],['π/3+kπ','π/3-kπ'],['√pi','sqrt(pi)']])assert(worksheetExpressionMatches(left,right),left);
 assert(!worksheetExpressionMatches('pi/3+k*pi','pi/3+2*k*pi'));
 assert(!worksheetExpressionMatches('x^2+1','x^2-1'));
 assert(worksheetAnswerMatches('{pi/3+k*pi;2*pi/3+k*pi}','{5*pi/3+k*pi;4*pi/3+k*pi}',{answer_format:'set'}));
 assert(worksheetAnswerMatches('∅','{}',{answer_format:'set'}));
});
test('expression parser rejects executable syntax and expensive exponent forms',()=>{
 for(const value of ['x=1;system(1)','factorial(999999)','2^(16*16*16)','2^99999','x^x','2^2^2','a:=1','sqrt((((((((((((1))))))))))))','constructor(1)','1+'.repeat(100)])assert.equal(canonicalWorksheetExpression(value),null,value);
});
test('solution images stay private until submission and are tied to the submitted revision',async()=>{
 const id=randomUUID(),worksheet_id=randomUUID(),student={id:randomUUID(),role:'student'},image={id,worksheet_id,is_solution:1};
 const snapshot={items:[{solutionImageIds:[id]}]};
 assert(snapshotIncludesSolution(JSON.stringify(snapshot),id));
 await assert.rejects(()=>requireSolutionImageSubmission(student,image,async()=>[]));
 await assert.rejects(()=>requireSolutionImageSubmission(student,image,async()=>[{snapshot:{items:[{solutionImageIds:[randomUUID()]}]}}]));
 await requireSolutionImageSubmission(student,image,async(sql,params)=>{assert(sql.includes('submitted_at IS NOT NULL'));assert.deepEqual(params,[worksheet_id,student.id]);return [{snapshot}];});
 await requireSolutionImageSubmission({role:'admin'},image,()=>assert.fail('admin does not need an attempt'));
 await requireSolutionImageSubmission(student,{...image,is_solution:0},()=>assert.fail('ordinary question images retain their access'));
});
test('manual authoring retains protected solution images and supports weighted THPT true/false sections',()=>{
 const id=randomUUID(),config={scoring:'school-points',period:'midterm1',semester:'hk1',duration_minutes:90};
 const sheet=validateSheet({title:'Đề Toán',grade:11,subject_id:'toan',status:'published',exam_config:config,items:[
  {id:randomUUID(),type:'true_false_group',points:4,prompt:'Chọn đúng sai',config:{statements:['a','b','c','d'],scoring:'thpt-2025'},answer:{values:[true,true,true,true]},solutionImageIds:[id]},
  {id:randomUUID(),type:'fill',points:6,prompt:'Rút gọn',config:{answer_format:'expression'},answer:{accepted:['sqrt(8)']}}
 ]});
 assert(!Object.hasOwn(publicItem(sheet.items[0]),'solutionImageIds'));
 const results=[gradeItem(sheet.items[0],[true,true,true,false]),gradeItem(sheet.items[1],'2sqrt(2)')].map((r,n)=>({id:sheet.items[n].id,...r}));
 assert.deepEqual(results[0].solutionImageIds,[id]);
 assert.deepEqual(worksheetExamScore(sheet.items,results,config),{points:8,maximum:10,percent:80});
 assert.throws(()=>validateSheet({...sheet,items:[{...sheet.items[0],imageId:id},sheet.items[1]]}));
});
