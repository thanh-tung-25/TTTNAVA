import {mkdir,writeFile} from 'node:fs/promises';
import {buildQ1LessonPack,q1LessonNumbers,q1WordLines} from '../src/services/chinese-q1-lesson-pack.js';
import {itemSchema,issues} from '../src/validators/chinese.js';
import {validateActivities} from '../src/services/chinese-activities.js';

const out=new URL('../../tai-lieu/tieng-trung-bai-7-10/',import.meta.url);await mkdir(out,{recursive:true});
const summary=[];
for(const number of q1LessonNumbers){
 const pack=buildQ1LessonPack(number);pack.items.forEach(item=>itemSchema.parse(item));
 const errors=issues(pack.items);if(errors.length)throw Error(`Bài ${number}: ${JSON.stringify(errors)}`);validateActivities(pack.activities);
 await writeFile(new URL(`du-lieu-bai-${number}.json`,out),JSON.stringify(pack,null,2)+'\n','utf8');
 await writeFile(new URL(`cau-hoi-tu-vung-tieng-trung-bai-${number}.txt`,out),q1WordLines(pack).join('\n')+'\n','utf8');
 summary.push({lesson:number,title:pack.title,vocabulary:pack.vocabulary.length,main:pack.vocabulary.filter(word=>word.group==='main').length,questions:pack.questions.length,grammar:pack.grammar.length,readings:pack.readings.length,activities:pack.activities.tasks.length,speaking:pack.speaking.length,assigned:pack.speaking.filter(question=>question.speaking_selected).length,pages:pack.pages,source:pack.source,sha256:pack.sha256});
}
await writeFile(new URL('thong-ke.json',out),JSON.stringify(summary,null,2)+'\n','utf8');
console.log(JSON.stringify(summary,null,2));
