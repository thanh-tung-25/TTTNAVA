import {el,button,card} from '/assets/js/chinese-common.js';
import {questionAudio,withChoiceAudio} from './question-audio.js';
import {animalPath} from './animal-path.js';
import {chineseQuestionPrompt} from './chinese-question-prompt.js';

// Only published activities supplied by the lesson API are rendered here.
export function mountPractice(host,lesson){
 let queue=[],index=0,correct=0,checked=false,selection='',chosen=[];
 const box=card('Luyện vận dụng',[]);box.classList.add('applied-practice');host.append(box);
 const tasks=lesson.tasks;
 const labels={order:'Xếp câu',fix:'Sửa lỗi',fill:'Điền từ',dialogue:'Hội thoại'};
 const normalized=value=>String(value).normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('zh');
 const matches=(a,b)=>normalized(a)===normalized(b);
 const primary=(text,fn)=>{const b=button(text,fn);b.classList.add('btn-primary');return b;};
 const mix=arr=>{const copy=[...arr];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
 let tokens=[],choices=[],currentType;
 const start=type=>{currentType=type;queue=mix(tasks.filter(t=>!type||t.type===type)).slice(0,10);index=0;correct=0;nextTask();};
 const nextTask=()=>{checked=false;selection='';chosen=[];tokens=mix(queue[index].tokens||[]);choices=mix(queue[index].options||[]);render();const heading=box.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});};
 function menu(){
  box.replaceChildren(el('h2',{text:'Luyện vận dụng'}),el('p',{text:lesson.topic+' · Mỗi lượt tối đa 10 câu, chọn ngẫu nhiên từ '+tasks.length+' hoạt động.'}),
   primary('Bắt đầu lượt ngắn',()=>start()),el('div',{class:'applied-shortcuts'},Object.entries(labels).filter(([type])=>tasks.some(t=>t.type===type)).map(([type,label])=>button(label,()=>start(type)))),
   el('p',{class:'muted',text:'Kết quả chỉ tính trong lượt này; không cộng hoặc trừ Kim Cương.'}));
  animalPath(box.querySelector('.applied-shortcuts'),{selector:':scope > button',title:'Luyện vận dụng',hint:'Bốn cách luyện trong bài. Chọn cách con muốn thử.'});
 }
 function render(){
  const task=queue[index],prompt=task.type==='dialogue'?'Nghe câu thoại và chọn câu đáp lại phù hợp.':chineseQuestionPrompt(task.prompt);
  box.replaceChildren(el('div',{class:'applied-heading'},[el('p',{class:'quiz-position',text:`${labels[task.type]} · ${index+1}/${queue.length}`}),button('Chọn cách luyện',menu)]),
   el('progress',{max:queue.length,value:index,'aria-label':'Tiến độ lượt luyện'}),
   el('h2',{text:task.type==='order'?prompt:task.type==='fix'?'Chọn câu sửa đúng':task.type==='fill'?'Điền từ còn thiếu':'Đến lượt bạn nói'}));
  const feedback=el('div',{'aria-live':'polite',class:'applied-feedback'});
  box.append(task.type==='dialogue'?questionAudio(task.speech,{language:'zh-CN'}):questionAudio((task.type==='fix'?'Chọn câu sửa đúng. ':task.type==='fill'?'Điền từ còn thiếu. ':'')+prompt));
  const check=primary('Kiểm tra',()=>{
   if(checked)return;
   if(!selection){feedback.textContent='Hãy chọn câu trả lời trước nhé.';return;}
   checked=true;const ok=matches(selection,task.answer);if(ok)correct++;
   render();const result=box.querySelector('.applied-feedback');result.tabIndex=-1;result.focus({preventScroll:true});
  });
  if(task.type==='order'){
   const output=el('div',{class:'applied-sentence',role:'group','aria-label':'Câu đã xếp'});
   const bank=el('div',{class:'applied-tokens',role:'group','aria-label':'Từ để xếp câu'});
   const update=()=>{selection=chosen.map(i=>tokens[i]).join('');output.replaceChildren(...chosen.map((id,n)=>{const b=button(tokens[id],()=>{chosen.splice(n,1);update();});b.disabled=checked;b.setAttribute('aria-label','Bỏ từ '+tokens[id]);return b;}));if(!chosen.length)output.append(el('span',{class:'muted',text:'Bấm các từ bên dưới để tạo câu.'}));bank.replaceChildren(...tokens.map((text,id)=>{const b=button(text,()=>{chosen.push(id);update();});b.disabled=checked||chosen.includes(id);return withChoiceAudio(b,text,id+1);}));check.disabled=checked||chosen.length!==tokens.length;};
   box.append(output,bank);update();
   const reset=button('Xếp lại',()=>{chosen=[];update();});reset.disabled=checked;box.append(reset);
  }else if(task.type==='fill'){
   box.append(el('p',{class:'applied-hanzi',text:prompt}));
   const input=el('input',{class:'quiz-text',type:'text','aria-label':'Từ cần điền',autocomplete:'off',value:selection});input.disabled=checked;input.oninput=()=>{selection=input.value;feedback.textContent='';};box.append(input);
  }else{
   if(task.type==='fix')box.append(el('p',{class:'applied-error',text:prompt}));
   else box.append(el('p',{text:prompt}),el('div',{class:'applied-bubble'},[el('p',{class:'applied-hanzi',text:task.speech})]));
   const options=el('div',{class:'quiz-choices'});
   for(const option of choices){
    const b=button(option,()=>{selection=option;options.querySelectorAll('button:not(.choice-audio button)').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));feedback.textContent='';});
    b.setAttribute('aria-pressed',String(selection===option));b.disabled=checked;options.append(withChoiceAudio(b,option,options.children.length+1));
   }
   box.append(options);
  }
  box.append(el('div',{class:'learn-actions'},[check]),feedback);
  if(checked){
   const ok=matches(selection,task.answer);feedback.classList.add(ok?'answer-correct':'answer-wrong');
   feedback.replaceChildren(el('strong',{text:ok?'Đúng rồi!':'Chưa đúng, xem cách dùng nhé.'}),el('p',{class:'applied-hanzi',text:task.answer}),...(['order','dialogue'].includes(task.type)&&task.pinyin?[el('p',{class:'pinyin',text:task.pinyin})]:[]),el('p',{text:task.explanation}));
   box.append(primary(index+1===queue.length?'Xem kết quả':'Tiếp tục →',()=>{index++;if(index===queue.length)finish();else nextTask();}));
  }
 }
 function finish(){
  box.replaceChildren(el('h2',{text:'Hoàn thành lượt luyện!'}),el('p',{class:'quiz-score',text:`${correct}/${queue.length}`}),el('p',{text:'Số câu đúng trong lượt luyện này.'}),el('div',{class:'learn-actions'},[primary('Luyện lại',()=>start(currentType)),button('Chọn cách luyện',menu)]));
 }
 menu();
}
