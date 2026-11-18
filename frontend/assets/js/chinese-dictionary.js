import {api,el} from './api.js';
import {questionAudio,stopQuestionAudio} from './question-audio.js';
import {createChineseHandwriting} from './chinese-handwriting.js';

const normalized=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/gu,'d').replace(/Đ/gu,'D').toLowerCase().trim();
const phonetic=value=>normalized(String(value||'').replace(/u:/giu,'v').normalize('NFD').replace(/u\u0308/giu,'v')).replace(/(?<=[a-z])[1-5]/gu,'').replace(/[\s'’\-]+/gu,'');
const p=(value,className='')=>el('p',{class:className,text:value});

export function mountChineseDictionary(profile,{initialBank=null,readOnly=false,renderAudio=questionAudio}={}){
 const trigger=document.getElementById('chinese-dictionary-open');if(!trigger||trigger.dataset.ready)return;
 trigger.dataset.ready='true';trigger.disabled=false;
 let bank=initialBank,loading=null,controller,dialog,input,list,status,scope,handwriting,handwritingToggle,limit=12,searchTimer;
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
  if(!matches.length)list.append(el('div',{class:'dictionary-empty'},[el('strong',{text:'Chưa có từ này trong khóa đang học'}),p('Bạn có thể viết lại, chọn chữ gợi ý khác hoặc nhập pinyin/tiếng Việt. Tra cứu hiện dùng từ vựng đã xuất bản của khóa đang học.')]));
  if(matches.length>limit){const more=el('button',{type:'button',class:'dictionary-more',text:'Xem thêm '+Math.min(12,matches.length-limit)+' từ'});more.onclick=()=>{limit+=12;render();};list.append(more);}
 }
 function wordCard(word){
  const card=el('article',{class:'dictionary-word'}),save=el('button',{type:'button',class:'dictionary-save',text:readOnly?'Bản xem thử':word.favorite?'✓ Đã lưu':'☆ Lưu từ','aria-label':(word.favorite?'Đã lưu ':'Lưu vào sổ từ: ')+word.hanzi});save.disabled=readOnly||word.favorite;
  save.onclick=async()=>{
   save.disabled=true;
   try{await api('/api/v1/chinese/reviews/'+word.id,{method:'PUT',body:{event_id:crypto.randomUUID(),favorite:true}});word.favorite=true;save.textContent='✓ Đã lưu';save.setAttribute('aria-label','Đã lưu '+word.hanzi);}
   catch(e){status.textContent=e.message;save.disabled=false;}
  };
  const audio=renderAudio(word.hanzi,{language:'zh-CN',label:'Nghe '+word.hanzi,compact:true});
  card.append(el('div',{class:'dictionary-word-head'},[el('div',{},[el('strong',{lang:'zh-CN',class:'dictionary-hanzi',text:word.hanzi}),el('span',{class:'dictionary-pinyin',text:word.pinyin})]),el('div',{class:'dictionary-word-actions'},[audio,save])]),p(word.meaning,'dictionary-meaning'));
  if(word.example)card.append(el('details',{class:'dictionary-example'},[el('summary',{text:'Ví dụ và cách dùng'}),p(word.example,'dictionary-example-hanzi'),...(word.example_pinyin?[p(word.example_pinyin,'dictionary-pinyin')]:[]),...(word.example_meaning?[p(word.example_meaning)]:[]),renderAudio(word.example,{language:'zh-CN',label:'Nghe câu ví dụ'})]));
  const locations=el('div',{class:'dictionary-lessons'},[el('span',{text:'Trong bài:'})]);
  for(const lesson of word.lessons)locations.append(el('a',{href:'?'+new URLSearchParams({set:lesson.set_id,mode:'cards',word:lesson.word_id}),text:lesson.title}));
  if(word.lessons.length)card.append(locations);return card;
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
  handwriting=createChineseHandwriting(char=>{
   if(input.value.length>=100){status.textContent='Ô tìm kiếm đã đủ 100 ký tự. Hãy xóa bớt để thêm chữ.';return;}
   // Handwritten characters append to an existing Han word; replace Latin text.
   input.value=/^\p{Script=Han}*$/u.test(input.value)?input.value+char:char;
   clearTimeout(searchTimer);limit=12;if(bank)render();
   const exact=bank?.words.find(word=>word.hanzi===input.value);
   return exact?[exact.hanzi,exact.pinyin,exact.meaning].filter(Boolean).join(' · ').slice(0,250):'Đã thêm '+char+'. Bạn có thể viết tiếp để ghép từ hoặc xem các từ tìm được bên dưới.';
  },()=>{input.value='';clearTimeout(searchTimer);limit=12;if(bank)render();},{characters:()=>[...new Set((bank?.words||[]).flatMap(word=>[...word.hanzi]).filter(char=>/^\p{Script=Han}$/u.test(char)))]});handwriting.node.id='dictionary-handwriting';handwriting.node.hidden=true;
  handwritingToggle=el('button',{type:'button',class:'dictionary-handwriting-toggle','aria-label':'Viết tay để tra chữ','aria-controls':'dictionary-handwriting','aria-expanded':'false',title:'Viết chữ Hán bạn nhớ',html:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15Z"/></svg>'});
  handwritingToggle.onclick=()=>{
   const show=handwriting.node.hidden;handwriting.node.hidden=!show;handwritingToggle.setAttribute('aria-expanded',String(show));dialog.classList.toggle('dictionary-handwriting-open',show);
   if(show){input.blur();handwriting.resume();handwriting.focus();}else handwriting.pause();
  };
  const form=el('form',{class:'dictionary-search'},[input,handwritingToggle,el('button',{type:'submit',text:'Tìm'})]);
  status=el('p',{class:'dictionary-status',role:'status','aria-live':'polite'});list=el('div',{class:'dictionary-results'});
  const search=()=>{limit=12;if(bank)render();};input.oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,120);};form.onsubmit=e=>{e.preventDefault();clearTimeout(searchTimer);search();};
  dialog.append(el('header',{class:'dictionary-heading'},[el('div',{},[el('span',{class:'dictionary-eyebrow',text:'TÌM MỘT TỪ · HIỂU THÊM MỘT CHÚT'}),el('h2',{id:'dictionary-title',text:'Tra từ tiếng Trung'}),scope]),close]),form,handwriting.node,status,list,el('footer',{class:'dictionary-footer'},readOnly?[p('Bản xem thử · từ mẫu trên thiết bị của bạn')]:[p('Lưu từ để ôn lại trong Sổ từ.'),el('a',{href:'?view=notebook&filter=favorite',text:'Mở Sổ từ →'})]));
  dialog.addEventListener('close',()=>{clearTimeout(searchTimer);handwriting.pause();stopQuestionAudio();window.speechSynthesis?.cancel();trigger.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  document.body.append(dialog);
 }
 trigger.onclick=()=>{if(!dialog)create();stopQuestionAudio();dialog.showModal();document.dispatchEvent(new Event('ttnava:dictionary-open'));if(handwriting.node.hidden)input.focus({preventScroll:true});else{handwriting.resume();handwriting.focus();}load();};
 window.addEventListener('pagehide',()=>{controller?.abort();handwriting?.pause();clearTimeout(searchTimer);},{once:true});
}
