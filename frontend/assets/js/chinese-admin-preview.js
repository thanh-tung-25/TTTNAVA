import {el,button,card,field} from './chinese-common.js';
import {chineseModes,itemMode} from './chinese-learning-modes.js';
import {wordTable,listeningPractice} from './chinese-study-extras.js';
import {mountPractice} from './chinese-applied-practice.js';
import {mountSpeaking} from './chinese-speaking.js';
import {questionAudio,withChoiceAudio,stopQuestionAudio} from './question-audio.js';
import {chineseQuestionPrompt} from './chinese-question-prompt.js';
import {mixStudy,uniqueStudyWords} from './chinese-study-variety.js';

export function mountAdminStudentPreview(host,{set,items,activities,profile,mode='cards'}){
 host.classList.add('admin-student-preview');host.replaceChildren();let dispose;
 const words=uniqueStudyWords(items.filter(i=>i.kind==='vocabulary')),questions=mixStudy(items.filter(i=>i.kind==='question')),reads=items.filter(i=>itemMode(i)==='read'),spoken=items.some(i=>itemMode(i)==='speak');
 const count={cards:words.length+questions.length,words:words.length,listen:words.length,quiz:questions.length,read:reads.length,apply:activities?.tasks?.length||0,speak:spoken||activities?.tasks?.some(t=>t.type==='dialogue')};
 const tabs=el('nav',{class:'admin-study-modes','aria-label':'Xem thử các mục học'}),content=el('div',{class:'admin-preview-content'});
 const links=[];
 for(const entry of chineseModes.filter(m=>count[m.key])){
  const b=button(entry.label,()=>render(entry.key));links.push({key:entry.key,button:b});tabs.append(b);
 }
 host.append(el('div',{class:'admin-preview-caption'},[el('strong',{text:'Xem như học sinh'}),el('span',{text:'Đang xem bản soạn · không lưu kết quả học'})]),el('div',{class:'admin-preview-studybar'},[el('span',{text:'←'}),el('h3',{text:set.lesson_title||set.title})]),tabs,content);
 function render(key,wordId){
  stopQuestionAudio();dispose?.();dispose=null;content.replaceChildren();for(const entry of links)entry.button.setAttribute('aria-current',entry.key===key?'page':'false');
  if(key==='words')return wordTable(content,words,set.id);
  if(key==='listen')return listeningPractice(content,words,set.id);
  if(key==='speak'){dispose=mountSpeaking(content,{set,items,activities,profile});return;}
  if(key==='apply'&&count.apply)return mountPractice(content,activities);
  if(key==='read'){for(const i of reads)content.append(card(i.data.title||'Bài đọc',[el('p',{class:'read-text',text:i.data.text})]));return;}
  if(key==='quiz'){quizPreview(content,questions);return;}
  const deck=mixStudy(words.length?words:questions);
  if(!deck.length){content.append(el('p',{text:'Chưa có nội dung cho mục này. Thêm nội dung rồi xem thử lại.'}));return;}
  let index=Math.max(0,deck.findIndex(i=>i.id===wordId)),flipped=false;const area=el('div');content.append(area);
  const draw=()=>{
   const i=deck[index],d=i.data,text=i.kind==='vocabulary'?(flipped?d.meaning:d.hanzi):(flipped?(d.accepted||[]).join(' / '):chineseQuestionPrompt(d.prompt));
   const face=button('',()=>{flipped=!flipped;draw();});face.className='flashcard';face.setAttribute('aria-label','Lật thẻ');face.setAttribute('aria-pressed',String(flipped));face.append(el('div',{class:i.kind==='vocabulary'?'hanzi':'study-prompt',text}));
   if(flipped&&d.pinyin)face.append(el('p',{class:'pinyin',text:d.pinyin}));
   area.replaceChildren(el('p',{class:'learn-caption',text:i.kind==='vocabulary'?'Thẻ từ vựng':'Thẻ câu hỏi'}),el('p',{class:'card-count',text:`Thẻ ${index+1} / ${deck.length}`}),face,el('div',{class:'learn-actions'},[button('← Trước',()=>{index=(index+deck.length-1)%deck.length;flipped=false;draw();}),button('Lật thẻ',()=>{flipped=!flipped;draw();}),button('Tiếp →',()=>{index=(index+1)%deck.length;flipped=false;draw();})]),questionAudio(i.kind==='vocabulary'?d.hanzi:chineseQuestionPrompt(d.prompt)));
  };draw();
 }
 content.addEventListener('click',event=>{const anchor=event.target.closest('a');if(anchor&&(anchor.closest('.hub-table')||anchor.href.includes('/pages/student/'))){event.preventDefault();render('cards',new URL(anchor.href).searchParams.get('word'));}});
 render(count[mode]?mode:chineseModes.find(m=>count[m.key])?.key||'cards');
 return ()=>dispose?.();
}
function quizPreview(host,questions){
 if(!questions.length){host.append(el('p',{text:'Chưa có câu hỏi quiz.'}));return;}
 let index=0;const area=el('div');host.append(area);
 const render=()=>{
  const d=questions[index].data;let value='';const feedback=el('p',{role:'status'}),choices=el('div',{class:'quiz-choices'}),prompt=chineseQuestionPrompt(d.prompt);
  const check=button('Kiểm tra',()=>{if(!value.trim()){feedback.textContent='Chọn hoặc nhập câu trả lời trước nhé.';return;}const normalize=v=>String(v).normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('zh'),ok=(d.accepted||[]).some(a=>normalize(a)===normalize(value));feedback.className=ok?'answer-correct':'answer-wrong';feedback.textContent=(ok?'Đúng rồi! ':'Chưa đúng. ')+(d.explanation||'');});
  if(['choice','listening'].includes(d.type))for(const [n,o]of (d.options||[]).entries()){
   const input=el('input',{type:'radio',name:'preview-answer',value:o,onchange:()=>{value=o;}}),label=el('label',{class:'quiz-option'},[input,el('span',{class:'option-letter',text:String.fromCharCode(65+n)}),el('span',{text:o})]);choices.append(withChoiceAudio(label,o,n+1));
  }else if(d.type==='ordering'&&d.options?.length){let chosen=[];const output=el('p');for(const [n,o]of d.options.entries()){const b=button(o,()=>{chosen.push(o);value=chosen.join(' ');output.textContent=value;b.disabled=true;});choices.append(withChoiceAudio(b,o,n+1));}choices.prepend(output);choices.append(button('Chọn lại',()=>{chosen=[];value='';output.textContent='';choices.querySelectorAll('.choice-with-audio>button').forEach(b=>{b.disabled=false;});}));}
  else if(d.type==='matching'&&d.options?.length){const selected=new Map();for(const left of d.options){const input=field(left,left,'','text',[['','Chọn nghĩa'],...(d.targets||[]).map(t=>[t,t])]);input.onchange=()=>{selected.set(left,input.querySelector('select').value);value=d.options.map(l=>l+'='+(selected.get(l)||'')).join(' | ');};choices.append(input);}}
  else choices.append(el('input',{class:'quiz-text','aria-label':'Câu trả lời xem thử',oninput:e=>{value=e.target.value;}}));
  area.replaceChildren(el('p',{class:'quiz-position',text:`Câu ${index+1} / ${questions.length}`}),card('',[el('p',{class:'quiz-prompt',text:prompt}),questionAudio(prompt),choices,check,feedback]),button('Câu tiếp theo →',()=>{index=(index+1)%questions.length;render();}));
 };render();
}
