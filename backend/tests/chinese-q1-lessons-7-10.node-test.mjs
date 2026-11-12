import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildQ1LessonPack} from '../src/services/chinese-q1-lesson-pack.js';

test('the four source PDFs produce complete lesson sections with valid source references',()=>{
 for(const number of [7,8,9,10]){
  const pack=buildQ1LessonPack(number);assert.equal(pack.number,number);assert.equal(pack.grammar.length,4);assert.equal(pack.readings.length,2);assert.equal(pack.speaking.length,10);assert.equal(pack.speaking.filter(question=>question.speaking_selected).length,3);
  assert.equal(pack.speaking_settings.duration_seconds,90);assert.equal(new Set(pack.vocabulary.map(word=>word.hanzi)).size,pack.vocabulary.length);assert(pack.vocabulary.every(word=>word.page>=1&&word.page<=pack.pages));
  assert.equal(pack.activities.tasks.length,40);for(const type of ['order','fix','fill','dialogue'])assert.equal(pack.activities.tasks.filter(task=>task.type===type).length,10);
 }
 const family=buildQ1LessonPack(10);assert.equal(family.vocabulary.find(word=>word.hanzi==='儿子').meaning,'con trai');assert.equal(family.vocabulary.find(word=>word.hanzi==='洗手间').meaning,'nhà vệ sinh');
});

test('synonymous relatives, week names and shop names cannot appear as competing correct translations',()=>{
 const groups=[['爸爸','父亲','老爸'],['妈妈','母亲','老妈'],['星期','周','礼拜'],['星期天','星期日'],['公交车','公共汽车'],['唱','唱歌'],['店','商店']];
 for(const number of [7,8,9,10]){
  const pack=buildQ1LessonPack(number);
  for(const group of groups)for(const word of pack.vocabulary.filter(word=>group.includes(word.hanzi))){
   const translation=pack.questions.find(question=>question.prompt===`Chọn chữ Hán có nghĩa “${word.meaning}”.`&&question.accepted[0]===word.hanzi);assert(translation);
   assert.deepEqual(translation.options.filter(option=>group.includes(option)),[word.hanzi]);
   const meaning=pack.questions.find(question=>question.prompt===`Trong bài học, “${word.hanzi}” có nghĩa là gì?`);
   const synonyms=pack.vocabulary.filter(other=>other.hanzi!==word.hanzi&&group.includes(other.hanzi)).map(other=>other.meaning);assert(meaning.options.every(option=>!synonyms.includes(option)||option===word.meaning));
  }
 }
});

test('open transport questions have a single relevant choice and dialogue prompts reveal no target meaning',()=>{
 const pack=buildQ1LessonPack(9),tasks=pack.activities.tasks.filter(task=>task.type==='dialogue');
 for(const task of tasks){assert.equal(task.prompt,'Nghe câu thoại và chọn câu đáp lại phù hợp.');assert.equal(task.options.length,3);assert.equal(new Set(task.options).size,3);assert(task.options.includes(task.answer));}
 const cinema=tasks.find(task=>task.speech==='我们怎么去电影院？');assert.equal(cinema.options.filter(option=>/坐地铁|走路|坐出租车/.test(option)).length,1);
 const park=tasks.find(task=>task.speech==='公园很近，我们怎么去？');assert.equal(park.options.filter(option=>/坐地铁|走路|坐出租车/.test(option)).length,1);
 for(const question of pack.speaking){assert(question.text.endsWith('？'));assert(question.answer_reference&&question.assessment_notes);assert(!question.text.includes('('));}
});
