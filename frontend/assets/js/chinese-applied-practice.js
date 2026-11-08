import {el,button,card} from '/assets/js/chinese-common.js';

// Only published activities supplied by the lesson API are rendered here.
export function mountPractice(host,lesson){
 let queue=[],index=0,correct=0,helped=false,checked=false,selection='',chosen=[];
 const box=card('Luyện vận dụng',[]);box.classList.add('applied-practice');host.append(box);
 const tasks=lesson.tasks;
 const labels={order:'Xếp câu',fix:'Sửa lỗi',fill:'Điền từ',dialogue:'Hội thoại'};
 const normalized=value=>String(value).normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('zh');
 const matches=(a,b)=>normalized(a)===normalized(b);
 const taskHint=task=>task.hint||(task.type==='dialogue'?task.meaning:task.type==='order'?'Bắt đầu bằng: '+task.tokens[0]:task.type==='fill'?'Hãy đọc cả câu trước khi điền từ.':task.explanation);
 const primary=(text,fn)=>{const b=button(text,fn);b.classList.add('btn-primary');return b;};
 const mix=arr=>{const copy=[...arr];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
 let tokens=[],choices=[];
 const start=type=>{queue=tasks.filter(t=>!type||t.type===type);index=0;correct=0;nextTask();};
 const nextTask=()=>{helped=false;checked=false;selection='';chosen=[];tokens=mix(queue[index].tokens||[]);choices=mix(queue[index].options||[]);render();const heading=box.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});};
 function menu(){
  box.replaceChildren(el('h2',{text:'Luyện vận dụng'}),el('p',{text:lesson.topic+' · Khoảng '+Math.max(1,Math.ceil(tasks.length*.7))+' phút, '+tasks.length+' hoạt động.'}),
   primary('Bắt đầu lượt ngắn',()=>start()),el('div',{class:'applied-shortcuts'},Object.entries(labels).filter(([type])=>tasks.some(t=>t.type===type)).map(([type,label])=>button(label,()=>start(type)))),
   el('p',{class:'muted',text:'Luyện tự do có gợi ý. Kết quả chỉ tính trong lượt này; không cộng hoặc trừ Kim Cương.'}));
 }
 function render(){
  const task=queue[index];
  box.replaceChildren(el('div',{class:'applied-heading'},[el('p',{class:'quiz-position',text:`${labels[task.type]} · ${index+1}/${queue.length}`}),button('Chọn cách luyện',menu)]),
   el('progress',{max:queue.length,value:index,'aria-label':'Tiến độ lượt luyện'}),
   el('h2',{text:task.type==='order'?task.prompt:task.type==='fix'?'Chọn câu sửa đúng':task.type==='fill'?'Điền từ còn thiếu':'Đến lượt bạn nói'}));
  const feedback=el('div',{'aria-live':'polite',class:'applied-feedback'});
  const check=primary('Kiểm tra',()=>{
   if(checked)return;
   if(!selection){feedback.textContent='Hãy chọn câu trả lời trước nhé.';return;}
   checked=true;const ok=matches(selection,task.answer);if(ok&&!helped)correct++;
   render();const result=box.querySelector('.applied-feedback');result.tabIndex=-1;result.focus({preventScroll:true});
  });
  if(task.type==='order'){
   const output=el('div',{class:'applied-sentence',role:'group','aria-label':'Câu đã xếp'});
   const bank=el('div',{class:'applied-tokens',role:'group','aria-label':'Từ để xếp câu'});
   const update=()=>{selection=chosen.map(i=>tokens[i]).join('');output.replaceChildren(...chosen.map((id,n)=>{const b=button(tokens[id],()=>{chosen.splice(n,1);update();});b.disabled=checked;b.setAttribute('aria-label','Bỏ từ '+tokens[id]);return b;}));if(!chosen.length)output.append(el('span',{class:'muted',text:'Bấm các từ bên dưới để tạo câu.'}));bank.replaceChildren(...tokens.map((text,id)=>{const b=button(text,()=>{chosen.push(id);update();});b.disabled=checked||chosen.includes(id);return b;}));check.disabled=checked||chosen.length!==tokens.length;};
   box.append(output,bank);update();
   const reset=button('Xếp lại',()=>{chosen=[];update();});reset.disabled=checked;box.append(reset);
  }else if(task.type==='fill'){
   box.append(el('p',{class:'applied-hanzi',text:task.prompt}));
   const input=el('input',{class:'quiz-text',type:'text','aria-label':'Từ cần điền',autocomplete:'off',value:selection});input.disabled=checked;input.oninput=()=>{selection=input.value;feedback.textContent='';};box.append(input);
  }else{
   if(task.type==='fix')box.append(el('p',{class:'applied-error',text:task.prompt}));
   else box.append(el('p',{text:task.prompt}),el('div',{class:'applied-bubble'},[el('p',{class:'applied-hanzi',text:task.speech}),el('p',{class:'pinyin',text:task.pinyin})]));
   const options=el('div',{class:'quiz-choices'});
   for(const option of choices){
    const b=button(option,()=>{selection=option;options.querySelectorAll('button').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));feedback.textContent='';});
    b.setAttribute('aria-pressed',String(selection===option));b.disabled=checked;options.append(b);
   }
   box.append(options);
  }
  const hint=button('Gợi ý',()=>{helped=true;hint.disabled=true;hintText.textContent=taskHint(task);});
  const hintText=el('p',{class:'muted','aria-live':'polite'});hint.disabled=checked||helped;
  if(helped)hintText.textContent=taskHint(task);
  box.append(el('div',{class:'learn-actions'},[check,hint]),hintText,feedback);
  if(checked){
   const ok=matches(selection,task.answer);feedback.classList.add(ok?'answer-correct':'answer-wrong');
   feedback.replaceChildren(el('strong',{text:ok?(helped?'Đúng rồi, có dùng gợi ý.':'Đúng rồi!'):'Chưa đúng, xem cách dùng nhé.'}),el('p',{class:'applied-hanzi',text:task.answer}),...(task.type==='order'?[el('p',{class:'pinyin',text:task.pinyin})]:[]),el('p',{text:task.explanation}));
   box.append(primary(index+1===queue.length?'Xem kết quả':'Tiếp tục →',()=>{index++;if(index===queue.length)finish();else nextTask();}));
  }
 }
 function finish(){
  box.replaceChildren(el('h2',{text:'Hoàn thành lượt luyện!'}),el('p',{class:'quiz-score',text:`${correct}/${queue.length}`}),el('p',{text:'Câu đúng không dùng gợi ý. Đây là kết quả của lượt luyện này.'}),el('div',{class:'learn-actions'},[primary('Luyện lại',()=>start(queue.every(t=>t.type===queue[0].type)?queue[0].type:undefined)),button('Chọn cách luyện',menu)]));
 }
 menu();
}
