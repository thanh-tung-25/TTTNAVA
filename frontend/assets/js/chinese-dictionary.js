import {api,el} from './api.js';
import {questionAudio,stopQuestionAudio} from './question-audio.js';

const normalized=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/gu,'d').replace(/Đ/gu,'D').toLowerCase().trim();
const phonetic=value=>normalized(String(value||'').replace(/u:/giu,'v').normalize('NFD').replace(/u\u0308/giu,'v')).replace(/(?<=[a-z])[1-5]/gu,'').replace(/[\s'’\-]+/gu,'');
const p=(value,className='')=>el('p',{class:className,text:value});

export function mountChineseDictionary(profile){
 const trigger=document.getElementById('chinese-dictionary-open');if(!trigger||trigger.dataset.ready)return;
 trigger.dataset.ready='true';trigger.disabled=false;
 let bank=null,loading=null,controller,dialog,input,list,status,scope,limit=12,searchTimer;
 function rank(word,q){
  const h=normalized(word.hanzi),py=phonetic(word.pinyin),variants=[py,py.replace(/v/gu,'u')],meaning=normalized(word.meaning),term=normalized(q),latin=phonetic(q);
  if(h===term)return 0;if(latin&&variants.includes(latin))return 1;if(meaning===term)return 2;
  if(h.startsWith(term))return 3;if(latin&&variants.some(value=>value.startsWith(latin)))return 4;
  if(h.includes(term))return 5;if(meaning.includes(term)||term.split(/\s+/u).every(t=>meaning.includes(t)))return 6;
  if(latin&&variants.some(value=>value.includes(latin)))return 7;return Infinity;
 }
 function render(){
  if(!bank)return;const term=input.value.trim();
  const matches=bank.words.map((word,index)=>({word,index,rank:term?rank(word,term):index})).filter(row=>Number.isFinite(row.rank)).sort((a,b)=>a.rank-b.rank||a.index-b.index);
  status.textContent=term?matches.length+' kết quả cho “'+term+'”':'Gợi ý từ trong '+bank.course.title+' · '+bank.count+' mục từ';
  list.replaceChildren(...matches.slice(0,limit).map(({word})=>wordCard(word)));
  if(!matches.length)list.append(el('div',{class:'dictionary-empty'},[el('strong',{text:'Chưa tìm thấy từ phù hợp'}),p('Thử nhập chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt. Phần tra cứu hiện dùng từ vựng đã xuất bản của khóa đang học.')]));
  if(matches.length>limit){const more=el('button',{type:'button',class:'dictionary-more',text:'Xem thêm '+Math.min(12,matches.length-limit)+' từ'});more.onclick=()=>{limit+=12;render();};list.append(more);}
 }
 function wordCard(word){
  const card=el('article',{class:'dictionary-word'}),save=el('button',{type:'button',class:'dictionary-save',text:word.favorite?'✓ Đã lưu':'☆ Lưu từ','aria-label':(word.favorite?'Đã lưu ':'Lưu vào sổ từ: ')+word.hanzi});save.disabled=word.favorite;
  save.onclick=async()=>{
   save.disabled=true;
   try{await api('/api/v1/chinese/reviews/'+word.id,{method:'PUT',body:{event_id:crypto.randomUUID(),favorite:true}});word.favorite=true;save.textContent='✓ Đã lưu';save.setAttribute('aria-label','Đã lưu '+word.hanzi);}
   catch(e){status.textContent=e.message;save.disabled=false;}
  };
  const audio=questionAudio(word.hanzi,{language:'zh-CN',label:'Nghe '+word.hanzi,compact:true});
  card.append(el('div',{class:'dictionary-word-head'},[el('div',{},[el('strong',{lang:'zh-CN',class:'dictionary-hanzi',text:word.hanzi}),el('span',{class:'dictionary-pinyin',text:word.pinyin})]),el('div',{class:'dictionary-word-actions'},[audio,save])]),p(word.meaning,'dictionary-meaning'));
  if(word.example)card.append(el('details',{class:'dictionary-example'},[el('summary',{text:'Ví dụ và cách dùng'}),p(word.example,'dictionary-example-hanzi'),...(word.example_pinyin?[p(word.example_pinyin,'dictionary-pinyin')]:[]),...(word.example_meaning?[p(word.example_meaning)]:[]),questionAudio(word.example,{language:'zh-CN',label:'Nghe câu ví dụ'})]));
  const locations=el('div',{class:'dictionary-lessons'},[el('span',{text:'Trong bài:'})]);
  for(const lesson of word.lessons)locations.append(el('a',{href:'?'+new URLSearchParams({set:lesson.set_id,mode:'cards',word:lesson.word_id}),text:lesson.title}));
  card.append(locations);return card;
 }
 async function load(){
  if(bank){render();return;}status.textContent='Đang mở từ vựng của khóa học…';
  if(!loading){controller=new AbortController();loading=api('/api/v1/chinese/dictionary?'+new URLSearchParams({courseId:profile.course.id}),{signal:controller.signal}).then(({data})=>{bank=data;return data;}).finally(()=>{loading=null;});}
  try{await loading;if(dialog.open){scope.textContent=bank.course.title+' · Chữ Hán, pinyin hoặc tiếng Việt';render();}}
  catch(e){if(!dialog.open)return;status.textContent='Chưa tải được từ vựng.';const retry=el('button',{type:'button',class:'dictionary-more',text:'Thử tải lại',onclick:()=>load()});list.replaceChildren(p(e.message),retry);}
 }
 function create(){
  dialog=el('dialog',{id:'chinese-dictionary-dialog',class:'chinese-dictionary','aria-labelledby':'dictionary-title'});
  const close=el('button',{type:'button',class:'dictionary-close',text:'×','aria-label':'Đóng tra từ',onclick:()=>dialog.close()});
  scope=p(profile.course.title+' · Tra từ trong khóa học','dictionary-scope');
  input=el('input',{type:'search',class:'dictionary-input',placeholder:'Nhập 老师, laoshi hoặc giáo viên…','aria-label':'Tìm chữ Hán, pinyin hoặc nghĩa tiếng Việt',autocomplete:'off',autocapitalize:'off',spellcheck:'false',maxlength:100});
  const form=el('form',{class:'dictionary-search'},[input,el('button',{type:'submit',text:'Tìm'})]);
  status=el('p',{class:'dictionary-status',role:'status','aria-live':'polite'});list=el('div',{class:'dictionary-results'});
  const search=()=>{limit=12;if(bank)render();};input.oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,120);};form.onsubmit=e=>{e.preventDefault();clearTimeout(searchTimer);search();};
  dialog.append(el('header',{class:'dictionary-heading'},[el('div',{},[el('span',{class:'dictionary-eyebrow',text:'TÌM MỘT TỪ · HIỂU THÊM MỘT CHÚT'}),el('h2',{id:'dictionary-title',text:'Tra từ tiếng Trung'}),scope]),close]),form,status,list,el('footer',{class:'dictionary-footer'},[p('Lưu từ để ôn lại trong Sổ từ.'),el('a',{href:'?view=notebook&filter=favorite',text:'Mở Sổ từ →'})]));
  dialog.addEventListener('close',()=>{clearTimeout(searchTimer);stopQuestionAudio();trigger.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  document.body.append(dialog);
 }
 trigger.onclick=()=>{if(!dialog)create();stopQuestionAudio();dialog.showModal();document.dispatchEvent(new Event('ttnava:dictionary-open'));input.focus({preventScroll:true});load();};
 window.addEventListener('pagehide',()=>{controller?.abort();clearTimeout(searchTimer);},{once:true});
}
