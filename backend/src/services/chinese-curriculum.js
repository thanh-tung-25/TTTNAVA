import {createHash} from 'node:crypto';
import {q1QuizVocabulary} from '../data/chinese-q1-quiz-vocabulary.js';
import {q1QuizApplication} from '../data/chinese-q1-quiz-application.js';
import {curriculumSpeaking} from '../data/chinese-curriculum-speaking.js';
import {segmentLearnedChinese} from './chinese-quiz-language.js';
import {planSourceQuiz} from './chinese-quiz-source.js';

export const curriculumVersion='user-vocabulary-2026-11-14';
const hash=s=>createHash('sha256').update(s).digest('hex');
const idFor=seed=>{const h=hash(seed);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const active=i=>i.active!==false&&i.active!==0;
const json=v=>typeof v==='string'?JSON.parse(v):v;
const topics=['Chào hỏi và giới thiệu vai trò','Tên và quốc tịch','Làm quen và bạn bè','Nơi đến và khoảng cách','Đồ ăn, đồ uống và mua hàng','Học tập và công việc','Địa điểm và chỉ đường','Ngày tháng và sinh nhật','Sở thích và phương tiện','Gia đình và sinh hoạt'];
const scenarios=['greeting','identity','meeting','going','food','work','directions','birthday','hobbies','family'];
const places=['school','school','school','park','restaurant','school','bank','bakery','cinema','home'];
const grammar=[
 ['Giới thiệu vai trò','Dùng chủ ngữ và 是 để giới thiệu mình hoặc người khác.','Chào hỏi','Dùng cách chào lịch sự với thầy cô và người lớn; chọn cách xưng hô phù hợp.'],
 ['Hỏi tên và quốc tịch','Dùng 什么 để hỏi tên; dùng 哪国人 để hỏi quốc tịch.','Câu hỏi có/không','Thêm 吗 vào cuối câu hỏi có/không; dùng 不 để phủ định.'],
 ['Diễn đạt sở hữu','Dùng 的 nối người sở hữu với danh thiếp hoặc bạn bè.','Giới thiệu và hỏi thăm','Dùng 有 hoặc 没有 để nói có/không có; dùng 也 và 都 theo ý câu.'],
 ['Hỏi nơi đến','Dùng 去 cùng địa điểm; dùng 哪儿 hoặc 哪里 để hỏi nơi đến.','Khoảng cách','Dùng 离 giữa hai địa điểm và 远 hoặc 近 để nói khoảng cách.'],
 ['Gọi món','Dùng 要 hoặc 想 để nói nhu cầu; kết hợp số và lượng từ khi gọi đồ ăn.','Câu hỏi lựa chọn','Dùng 还是 giữa hai lựa chọn khi hỏi người đối thoại.'],
 ['Địa điểm và hành động','Dùng 在 cùng địa điểm hoặc 正在 trước hành động đang diễn ra.','Khả năng và sự cho phép','Dùng 会 cho điều đã biết làm; dùng 能 hoặc 可以 phù hợp với hoàn cảnh.'],
 ['Vị trí','Dùng địa điểm và 旁边, 对面, 里面 hoặc 外面 để nói vị trí.','Chỉ đường','Dùng 往 với phương hướng; dùng 然后 để nối các bước.'],
 ['Ngày tháng và giờ','Diễn đạt ngày bằng 年, 月, 号; dùng 点, 分 hoặc 半 khi nói giờ.','Trải nghiệm và mức độ','Dùng 过 để nói trải nghiệm đã từng; dùng cấu trúc 太……了 phù hợp với câu.'],
 ['Sở thích và đi lại','Dùng 喜欢 với sở thích; dùng 坐, 骑 hoặc 开 phù hợp với phương tiện.','Hai đặc điểm','Dùng 又……又…… để nêu hai đặc điểm của cùng một người hoặc sự vật.'],
 ['Gia đình','Dùng 口 để đếm người trong gia đình và 岁 để nói tuổi.','Sinh hoạt','Dùng 正在 trước hành động đang làm; dùng 但是 để nối hai ý tương phản.'],
];
export function sentenceTokens(text,number){
 return (text.match(/\p{Script=Han}+|[^\p{Script=Han}]/gu)||[]).flatMap(s=>/\p{Script=Han}/u.test(s)?segmentLearnedChinese(s,number):[s]);
}
export function curriculumChatSettings(number){
 const source=q1QuizVocabulary.find(l=>l.number===number),opening=curriculumSpeaking[number][0];
 return {enabled:true,scenario_id:scenarios[number-1],goal:`Trò chuyện về ${topics[number-1].toLocaleLowerCase('vi')}; chỉ dùng từ đã học từ bài 1 đến bài ${number}.`,opening:opening.text,translation:opening.meaning,required_words:source.words.slice(0,20).map(w=>w.hanzi),max_turns:10};
}
export function curriculumActivities(number){
 const pairs=q1QuizApplication[number],tasks=[],long=pairs.filter(s=>sentenceTokens(s.hanzi,number).filter(t=>/\p{Script=Han}/u.test(t)).length>=3).slice(0,10);
 if(long.length<10)throw Error('Thiếu câu xếp từ.');
 for(const s of long){
  const tokens=sentenceTokens(s.hanzi,number),target=tokens.findIndex(t=>/\p{Script=Han}/u.test(t)&&!['我','你','他','她','是','的','我们','你们','他们','她们'].includes(t));
  const blank=[...tokens];blank[target]='___';
  tasks.push({type:'order',prompt:s.meaning,tokens,answer:s.hanzi,explanation:`${s.hanzi} — ${s.meaning}`});
  tasks.push({type:'fill',prompt:blank.join('')+' ('+s.meaning+')',answer:tokens[target],explanation:`Câu hoàn chỉnh: ${s.hanzi} — ${s.meaning}`});
 }
 for(let i=0;i<10;i++){
  const s=pairs[i],other=pairs[(i+7)%pairs.length];
  tasks.push({type:'fix',prompt:`Sửa câu cho đúng nghĩa “${s.meaning}”: ${other.hanzi}`,answer:s.hanzi,options:[s.hanzi,other.hanzi,pairs[(i+13)%pairs.length].hanzi],explanation:`${s.hanzi} — ${s.meaning}`});
  const spoken=curriculumSpeaking[number][i],questionWords=segmentLearnedChinese(spoken.text+spoken.answer_reference,number).filter(t=>!['我','你','您','他','她','吗','的','是','了','什么','谁','哪儿','哪里'].includes(t));
  const pool=number===1?[{hanzi:'你好！'},{hanzi:'您好！'},{hanzi:'大家好！'}]:q1QuizVocabulary.filter(l=>l.number<=number).flatMap(l=>q1QuizApplication[l.number]).filter(row=>!questionWords.some(word=>row.hanzi.includes(word)));
  const wrong=[...new Set(pool.map(s=>s.hanzi))].filter(s=>s!==spoken.answer_reference).slice(0,2);
  if(wrong.length<2)throw Error('Thiếu lựa chọn hội thoại.');
  tasks.push({type:'dialogue',prompt:'Nghe câu hỏi và chọn câu trả lời phù hợp.',speech:spoken.text,answer:spoken.answer_reference,options:[spoken.answer_reference,...wrong],explanation:`${spoken.meaning} Đáp lại: ${spoken.answer_reference}`});
 }
 return {topic:topics[number-1],tasks};
}
export function curriculumStreet(number){
 const pairs=q1QuizApplication[number],indices=[0,5,10];
 if(number===7)return {enabled:true,place_id:'bank',missions:[
  {id:'bank-right',title:'Ngân hàng ở bên nào?',speech:'中国银行在饭馆的右边。',answer:'bank',feedback:'Ngân hàng Trung Quốc ở bên phải nhà hàng.'},
  {id:'office-left',title:'Tìm công ty',speech:'请问，公司在哪儿？',answer:'office',feedback:'公司 là công ty. Chọn tòa nhà văn phòng.'},
  {id:'home-right',title:'Tìm nhà của bạn',speech:'我家在电影院的右边。',answer:'home',feedback:'Nhà mình ở bên phải rạp phim.'}
 ].map(m=>({...m,instruction:'Nghe rồi chạm vào đúng địa điểm trên bản đồ.',type:'map',options:[]}))};
 return {enabled:true,place_id:places[number-1],missions:indices.map((index,n)=>{
  const choices=[pairs[index],pairs[(index+7)%20],pairs[(index+13)%20]],answer='c'+(n+1);
  [choices[0],choices[n]]=[choices[n],choices[0]];
  return {id:`vocab-${number}-${n+1}`,title:`Nghe hiểu ${n+1}`,instruction:'Nghe câu tiếng Trung rồi chọn đúng nghĩa.',speech:pairs[index].hanzi,type:'choice',options:choices.map((s,j)=>({id:'c'+(j+1),label:s.meaning})),answer,feedback:`${pairs[index].hanzi} — ${pairs[index].meaning}`};
 })};
}
export function validateCurriculumChinese(value,number){
 if(typeof value==='string'){segmentLearnedChinese(value,number);return;}
 if(Array.isArray(value)){value.forEach(v=>validateCurriculumChinese(v,number));return;}
 if(value&&typeof value==='object')for(const v of Object.values(value))validateCurriculumChinese(v,number);
}
export function planCurriculum({number,setId,items,speakingSettings}){
 const source=q1QuizVocabulary.find(l=>l.number===number);if(!source)throw Error('Không thuộc nguồn HSK 1 đã xác nhận.');
 const original=items.map(i=>({...i,data:json(i.data)})),desired=[],used=new Set();
 function add(kind,key,data,position,match){
  const previous=original.find(i=>i.kind===kind&&!used.has(i.id)&&active(i)&&match?.(i))||original.find(i=>i.kind===kind&&!used.has(i.id)&&match?.(i));
  const id=previous?.id||idFor(`${setId}:${curriculumVersion}:${kind}:${key}`);used.add(id);desired.push({id,set_id:setId,kind,position,data,active:1});return id;
 }
 const words=source.words.map((word,n)=>{
  const example=q1QuizApplication[number].find(s=>s.hanzi.includes(word.hanzi)),data={hanzi:word.hanzi,pinyin:word.pinyin,meaning:word.meaning,group:word.group==='main'?'main':'extended',...(example?{example:example.hanzi,example_meaning:example.meaning}:{})};
  const id=add('vocabulary',word.hanzi,data,n+1,i=>i.data.hanzi===word.hanzi);return {...word,id,data};
 });
 const g=grammar[number-1];
 for(let n=0;n<2;n++)add('grammar','grammar-'+n,{title:g[n*2],text:g[n*2+1]+'\nVí dụ: '+q1QuizApplication[number][5+n].hanzi},201+n,i=>i.data.title===g[n*2]);
 for(let n=0;n<2;n++){
  const rows=q1QuizApplication[number].slice(5+n*4,9+n*4);
  add('reading','reading-'+n,{title:`Đọc hiểu ${n+1}`,text:rows.map(s=>s.hanzi).join('\n'),meaning:rows.map(s=>s.meaning).join('\n')},211+n,i=>i.data.title===`Đọc hiểu ${n+1}`);
 }
 const dialogue=curriculumSpeaking[number].slice(0,3).map(q=>'A: '+q.text+'\nB: '+q.answer_reference).join('\n');
 add('dialogue','conversation',{title:'Hội thoại trong bài',text:dialogue},221,i=>i.data.title==='Hội thoại trong bài'&&!i.data.practice);
 const previousSpoken=original.filter(i=>active(i)&&i.kind==='dialogue'&&i.data.practice==='speaking'),configured=previousSpoken.some(i=>i.data.speaking_selected!==undefined);
 for(const [n,q]of curriculumSpeaking[number].entries()){
  const previous=previousSpoken[n];
  const selected=configured?(previous?previous.data.speaking_selected!==false:false):n<3;
  add('dialogue','spoken-'+n,{practice:'speaking',...q,speaking_selected:selected},301+n,i=>i.id===previous?.id);
 }
 if(!desired.some(i=>i.data.practice==='speaking'&&i.data.speaking_selected))desired.filter(i=>i.data.practice==='speaking').slice(0,3).forEach(i=>i.data.speaking_selected=true);
 const merged=original.map(i=>desired.find(d=>d.id===i.id)||{...i,active:i.kind==='question'?i.active:0});
 merged.push(...desired.filter(d=>!original.some(i=>i.id===d.id)));
 const quiz=planSourceQuiz({number,setId,items:merged});
 const questions=quiz.questions.map(({id,set_id,kind,position,data,active})=>({id,set_id,kind,position,data,active}));
 const activities=curriculumActivities(number),chat=curriculumChatSettings(number),street=curriculumStreet(number);
 validateCurriculumChinese(desired.filter(i=>i.kind!=='vocabulary').map(i=>i.data),number);validateCurriculumChinese(activities,number);validateCurriculumChinese(chat,number);validateCurriculumChinese(street,number);
 return {number,setId,source,words,items:[...desired,...questions],activities,chat,street,speakingSettings:json(speakingSettings)||{duration_seconds:90,order:'sequential',ai_assessment:true},report:{lesson:number,vocabulary:words.length,quiz:questions.length,speaking:10,readings:2,grammar:2,dialogues:1,activities:activities.tasks.length,street:street.missions.length}};
}
