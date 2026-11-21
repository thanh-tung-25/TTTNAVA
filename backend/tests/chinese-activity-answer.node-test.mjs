import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chineseActivityMatches} from '../../frontend/assets/js/chinese-activity-answer.js';
import {activityTemplate} from '../../frontend/assets/js/chinese-activity-templates.js';
import {validateStudyEvidence} from '../src/services/study-activity-source.js';

const teacher={type:'fill',prompt:'我是___。 (Tôi là giáo viên.)',answer:'老师'};
test('teacher fill accepts the word and equivalent keyboard formatting',()=>{
 for(const value of ['老师',' 老师 ','老 师','老\u3000师','老\u200b师','老师。','老师.','老师！','老师\n'])assert(chineseActivityMatches(teacher,value),JSON.stringify(value));
});
test('a complete correct sentence is accepted only when all fixed words match',()=>{
 for(const value of ['我是老师。','我 是 老 师 。','我是老师','我是老师.','我是老师！'])assert(chineseActivityMatches(teacher,value),value);
 for(const value of ['你是老师。','我不是老师。','我是老师们。','我是老是。','我是老师。你呢？'])assert(!chineseActivityMatches(teacher,value),value);
});
test('a different Chinese character, pinyin or Vietnamese meaning is still incorrect',()=>{
 for(const value of ['老是','老帅','学生','laoshi','lǎoshī','giáo viên','','  ','。','我是___。','老师老师'])assert(!chineseActivityMatches(teacher,value),JSON.stringify(value));
});
test('prefix gaps, full-width blanks and translated notes work without stripping negation',()=>{
 assert(chineseActivityMatches({type:'fill',prompt:'___是学生。 (Chúng tôi là học sinh.)',answer:'我们'},'我们是学生。'));
 assert(chineseActivityMatches({type:'fill',prompt:'我＿＿＿老师。（Tôi không phải giáo viên.）',answer:'不是'},'我不是老师。'));
 assert(!chineseActivityMatches({type:'fill',prompt:'我___老师。 (Tôi không phải giáo viên.)',answer:'不是'},'我是老师。'));
});
test('ambiguous prompts never infer a full sentence',()=>{
 assert(!chineseActivityMatches({...teacher,prompt:'___是___。'},'老师是老师。'));
 assert(!chineseActivityMatches({...teacher,prompt:'Điền từ vào câu: 我是___。'},'我是老师。'));
 assert(!chineseActivityMatches({...teacher,prompt:'我是老师。'},'我是老师。'));
});
test('other application types retain their exact choice and word-order rules',()=>{
 assert(chineseActivityMatches({type:'order',answer:'我是老师。'},' 我是老师。 '));
 assert(!chineseActivityMatches({type:'order',answer:'我是老师。'},'我 是 老师。'));
 for(const type of ['fix','dialogue']){assert(chineseActivityMatches({type,answer:'老师好！'},'老师好！'));assert(!chineseActivityMatches({type,answer:'老师好！'},'你好！'));}
});
test('backend scoring uses the same matcher as the visible feedback',()=>{
 const tasks=[teacher,{type:'fill',prompt:'我___学生。',answer:'是'},{type:'dialogue',answer:'你好！',options:['你好！','再见！']}];
 const snapshot={kind:'application',required:3,items:tasks.map((data,index)=>({id:String(index),data}))};
 const answers=['我是老师。',' 是。 ','你好！'];
 const result=validateStudyEvidence(snapshot,{items:answers.map((answer,index)=>({id:String(index),answer}))},new Date());assert.deepEqual(result,{completed:3,correct:3});
 answers[0]='我是老是。';assert.equal(validateStudyEvidence(snapshot,{items:answers.map((answer,index)=>({id:String(index),answer}))},new Date()).correct,2);
});
test('all ten published curriculum templates still accept every intended answer',()=>{
 const titles=['你好','你叫什么名字','很高兴认识你','你去哪儿','你要吃什么','你在哪儿工作','中国银行在哪儿','你的生日是几月几号','你喜欢中国电影还是美国电影','你家有几口人'];let count=0;
 for(const title of titles)for(const task of activityTemplate({level_id:1,title}).tasks){assert(chineseActivityMatches(task,task.answer),title+': '+task.prompt);count++;}assert.equal(count,400);
});
