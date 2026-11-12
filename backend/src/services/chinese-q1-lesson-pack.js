import {createHash} from 'node:crypto';
import {q1Lessons7to10} from '../data/chinese-q1-lessons-7-10.js';
import {chineseQuestionPrompt} from '../../../frontend/assets/js/chinese-question-prompt.js';

const lines=block=>block.trim().split('\n').map(line=>line.split('|').map(value=>value.trim()));
const ordered=(values,seed)=>[...values].sort((a,b)=>createHash('sha256').update(seed+JSON.stringify(a)).digest('hex').localeCompare(createHash('sha256').update(seed+JSON.stringify(b)).digest('hex')));
const invariant=(condition,message)=>{if(!condition)throw Error(message);};
// Close synonyms must not be used as distractors, even when the Vietnamese
// gloss mentions a different register or wording for the same concept.
const equivalentWords=[['店','商店'],['号','日'],['星期','周','礼拜'],['星期天','星期日'],['公交车','公共汽车'],['骑','骑车'],['雨天','下雨'],['等','等等'],['爸爸','父亲','老爸'],['妈妈','母亲','老妈'],['唱','唱歌'],['狗','小狗'],['洗','洗衣服','洗碗']];
const equivalent=(a,b)=>equivalentWords.some(group=>group.includes(a)&&group.includes(b));
// Reviewed alternatives avoid multiple reasonable replies (for example both
// walking and taking the metro can answer an open transport question).
const dialogueWrongIndices={
 7:[[6,8],[5,6],[5,6],[1,6],[5,7],[1,6],[0,3],[5,6],[0,5],[1,6]],
 8:[[1,6],[0,6],[0,7],[1,7],[1,7],[1,7],[1,7],[1,6],[1,7],[1,7]],
 9:[[2,4],[5,8],[0,5],[6,8],[0,8],[1,4],[0,8],[2,8],[5,6],[0,5]],
 10:[[3,9],[4,9],[3,4],[2,4],[0,9],[2,9],[0,4],[2,4],[0,4],[0,4]],
};

export function buildQ1LessonPack(number){
 const source=q1Lessons7to10.find(lesson=>lesson.number===number);invariant(source,'Không có bài nguồn.');
 const vocabulary=['main','extended'].flatMap(group=>lines(source[group]).map(([hanzi,pinyin,meaning,page])=>({hanzi,pinyin,meaning,page:Number(page),group})));
 invariant(new Set(vocabulary.map(word=>word.hanzi)).size===vocabulary.length,`Bài ${number}: trùng từ vựng.`);
 invariant(vocabulary.every(word=>word.hanzi&&word.pinyin&&word.meaning&&word.page>0&&word.page<=source.pages),`Bài ${number}: thiếu dữ liệu hoặc trang nguồn.`);
 const questions=[];
 const add=(prompt,accepted,wrong,explanation,page,difficulty='easy')=>{
  const options=ordered([accepted,...wrong],`${number}:${prompt}`);
  invariant(options.length===4&&new Set(options).size===4,`Lựa chọn không hợp lệ: ${prompt}`);
  questions.push({prompt:chineseQuestionPrompt(prompt),type:'choice',options,accepted:[accepted],explanation:explanation+` Tham chiếu: PDF bài ${number}, trang ${page}.`,difficulty,approved:true});
 };
 for(const [index,word]of vocabulary.entries()){
  const pool=vocabulary.filter(other=>other.hanzi!==word.hanzi&&!equivalent(other.hanzi,word.hanzi)&&other.meaning!==word.meaning&&other.pinyin!==word.pinyin);
  for(const [field,prompt]of [['meaning',`Trong bài học, “${word.hanzi}” có nghĩa là gì?`],['hanzi',`Chọn chữ Hán có nghĩa “${word.meaning}”.`],['pinyin',`Chọn phiên âm đúng của “${word.hanzi}”.`]]){
   const candidates=[...new Set(pool.map(other=>other[field]))].filter(value=>value!==word[field]);
   add(prompt,word[field],ordered(candidates,`${number}:${index}:${field}`).slice(0,3),`${word.hanzi} đọc là ${word.pinyin}, nghĩa là ${word.meaning}.`,word.page);
  }
 }
 for(const row of lines(source.context)){
  invariant(row.length===7,`Bài ${number}: dòng câu hỏi cần 7 cột.`);
  const [prompt,correct,a,b,c,explanation,page]=row;add(prompt,correct,[a,b,c],explanation,Number(page),'medium');
 }
 const speaking=lines(source.speaking).map(([text,meaning,answer_reference,assessment_notes],index)=>({practice:'speaking',text,meaning,answer_reference,assessment_notes,speaking_selected:index<3}));
 invariant(speaking.length===10&&speaking.every(question=>question.text.endsWith('？')&&question.text.length<=180&&question.meaning&&question.answer_reference&&question.assessment_notes),`Bài ${number}: luyện nói cần 10 câu hỏi có dữ liệu chấm cho cô.`);
 const rows=lines(source.activities).map(([meaning,segmented,wrong,speech,explanation])=>({meaning,tokens:segmented.split('/'),wrong,speech,explanation}));
 invariant(rows.length===10,`Bài ${number}: cần 10 tình huống vận dụng.`);
 const tasks=rows.flatMap((row,index)=>{
  const answer=row.tokens.join(''),target=row.tokens.findIndex(token=>!['我','你','他','她','我们','你们','他们','这','那','，','。','！','？'].includes(token)),fill=[...row.tokens],missing=fill[target];fill[target]='___';
  // Answers come from distinct situations in the same lesson. Student dialogue
  // prompts contain no Vietnamese target answer or pinyin hint.
  const distractors=dialogueWrongIndices[number][index].map(n=>rows[n].tokens.join(''));
  return [
   {type:'order',prompt:row.meaning,tokens:row.tokens,answer,explanation:row.explanation},
   {type:'fix',prompt:row.wrong,options:ordered([answer,row.wrong],`${number}:fix:${index}`),answer,explanation:row.explanation},
   {type:'fill',prompt:fill.join(''),answer:missing,explanation:row.explanation},
   {type:'dialogue',prompt:'Nghe câu thoại và chọn câu đáp lại phù hợp.',speech:row.speech,options:ordered([answer,...distractors],`${number}:dialogue-options:${index}`),answer,explanation:row.explanation},
  ];
 });
 const items=[...vocabulary.map(({page,...data})=>({kind:'vocabulary',data})),...questions.map(data=>({kind:'question',data})),...source.grammar.map(({page,...data})=>({kind:'grammar',data:{...data,text:data.text+`\nNguồn: PDF bài ${number}, trang ${page}.`}})),...source.readings.map(({page,...data})=>({kind:'reading',data:{...data,text:data.text+`\n\n${data.meaning}\nNguồn: PDF bài ${number}, trang ${page}.`}})),...speaking.map(data=>({kind:'dialogue',data}))];
 const title=`Bài ${number}. ${source.hanzi} — ${source.title}`;
 return {...source,title,vocabulary,questions,speaking,items,activities:{topic:source.topic,tasks,revision:0,status:'published'},speaking_settings:{duration_seconds:90,order:'sequential',ai_assessment:true}};
}

export const q1LessonNumbers=[7,8,9,10];
export function q1WordLines(pack){
 const output=['MÔN: Tiếng Trung','LỚP: HSK 1',`CHỦ ĐỀ: ${pack.title}`,'[TU VUNG]'];
 for(const word of pack.vocabulary)output.push([word.hanzi,word.pinyin,word.meaning,'','','','','','','','',word.group].join(' | '));
 output.push('[CAU HOI]');
 pack.questions.forEach((question,index)=>output.push(`Câu ${index+1}. ${question.prompt}`,...question.options.map((option,n)=>`${'ABCD'[n]}. ${option}`),`Đáp án: ${'ABCD'[question.options.indexOf(question.accepted[0])]}`,`Lời giải: ${question.explanation}`,`Độ khó: ${question.difficulty==='easy'?'Dễ':'Vừa'}`));
 output.push('[NGU PHAP]',...pack.grammar.map(item=>`${item.title}：${item.text.replaceAll('\n',' ')} (PDF trang ${item.page})`));
 output.push('[BAI DOC]',...pack.readings.map(item=>`${item.title}：${item.text.replaceAll('\n',' ')} ${item.meaning} (PDF trang ${item.page})`));
 output.push('[LUYEN NOI]',...pack.speaking.map(question=>[question.text,question.meaning,question.answer_reference,question.assessment_notes].join(' | ')));
 return output;
}
