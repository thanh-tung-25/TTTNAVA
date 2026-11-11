import {request,el,root,button,card,field,values,notice,error} from './chinese-common.js';
import {questionAudio,stopQuestionAudio} from './question-audio.js';
import {mountAdminStudentPreview} from './chinese-admin-preview.js';
import {adminModeHeader} from './chinese-admin-modes.js';

export function speakingEditor(result,{lesson,profile,catalog,add=false}){
 const set=result.set;let items=result.items.map(i=>({...i,data:{...i.data}})),dirty=false,dispose;
 const host=root(),list=el('div',{class:'admin-speaking-list'}),preview=el('div',{hidden:true}),status=el('p',{class:'simple-status'}),title=field('Tên tài liệu luyện nói','title',set.title);
 const edit=el('div',{class:'admin-speaking-edit'}),count=el('span',{class:'admin-speaking-count'});
 const act=(text,fn,primary=false)=>{const b=button(text,async()=>{b.disabled=true;try{await fn();}catch(e){const details=Array.isArray(e.details)?e.details.map(d=>`Mục ${d.index}: ${d.message}`).join('\n'):'';error(new Error(e.message+(details?'\n'+details:'')));}finally{b.disabled=false;}});if(primary)b.classList.add('btn-primary');return b;};
 const collect=()=>list.querySelectorAll('form[data-index]').forEach(form=>{const item=items[Number(form.dataset.index)];for(const [key,value]of Object.entries(values(form)))item.data[key]=value.trim();});
 const changed=()=>{dirty=true;};
 const render=()=>{
  list.replaceChildren();count.textContent=items.filter(i=>i.data.practice==='speaking').length+' câu luyện nói';status.textContent=set.status==='published'?(set.lesson_status==='published'?'Học sinh đang xem được':'Đã duyệt tài liệu · bài học chưa mở'):'Bản nháp · học sinh chưa xem được';status.classList.toggle('published',set.status==='published'&&set.lesson_status==='published');
  for(const [index,item]of items.entries()){
   const form=el('form',{'data-index':index}),box=el('article',{class:'admin-speaking-question'});
   box.append(el('div',{class:'admin-speaking-question-head'},[el('strong',{text:`Câu ${index+1}`}),act('Bỏ câu',()=>{collect();items.splice(index,1);changed();render();})]));
   if(item.data.practice==='speaking'){
    const question=field('Câu hỏi tiếng Trung','text',item.data.text,'textarea');question.querySelector('textarea').maxLength=180;
    form.append(question,field('Nghĩa tiếng Việt (chỉ để cô kiểm tra)','meaning',item.data.meaning||'','textarea'));
    box.append(form,questionAudio(()=>form.querySelector('[name=text]').value,{language:'zh-CN'}),el('small',{text:'Câu tiếng Trung này sẽ được đọc cho học sinh và ghép vào video. Nghĩa tiếng Việt chỉ dùng ở màn soạn bài.'}));
    if(! /\p{Script=Han}/u.test(item.data.text||'')||(item.data.text||'').length>180)box.append(el('p',{class:'admin-source-warning',text:'Cần nhập câu tiếng Trung, tối đa 180 ký tự trước khi đăng.'}));
   }else box.append(el('p',{class:'admin-source-warning',text:'Đoạn chưa nhận diện: '+item.data.text}),el('p',{text:'Hãy sửa định dạng Word hoặc bỏ đoạn này trước khi cho học sinh xem.'}));
   list.append(box);
  }
  if(!items.length)list.append(el('p',{class:'simple-empty',text:'Chưa có câu hỏi. Thêm câu tiếng Trung hoặc quay lại bài học để nhập Word.'}));
 };
 const show=()=>{
  collect();stopQuestionAudio();dispose?.();edit.hidden=true;preview.hidden=false;footer.hidden=true;
  dispose=mountAdminStudentPreview(preview,{set:{...set,title:title.querySelector('input').value},items,activities:null,profile,mode:'speak'});
  preview.scrollIntoView({block:'start',behavior:'smooth'});
 };
 const back=()=>{stopQuestionAudio();dispose?.();dispose=null;preview.replaceChildren();preview.hidden=true;edit.hidden=false;footer.hidden=false;};
 const save=async publish=>{
  collect();
  if(!publish&&set.status==='published'&&!confirm('Lưu bản nháp sẽ ẩn tài liệu luyện nói này với học sinh. Tiếp tục?'))return;
  if(publish&&!confirm(`Cho học sinh xem ${items.filter(i=>i.data.practice==='speaking').length} câu ở ${set.lesson_title} → Luyện nói?`))return;
  await request('/sets/'+set.id,'PUT',{title:title.querySelector('input').value,status:publish?'published':'draft',items});
  if(publish&&set.lesson_status!=='published')await request('/lessons/'+lesson.id,'PUT',{...lesson,description:lesson.description||'',image_url:lesson.image_url||'',status:'published'});
  dirty=false;location.href='?lesson='+set.lesson_id+'&mode=speak';
 };
 edit.append(card('Câu hỏi cô đã nhập từ Word',[...(set.document_id?[el('p',{class:'admin-import-note',text:'Nguồn Word: '+(set.filename||set.title)}),el('a',{href:'/api/v1/chinese/documents/'+set.document_id,text:'Tải file Word gốc'})]:[]),title,el('div',{class:'admin-speaking-toolbar'},[count,act('+ Thêm câu tiếng Trung',()=>{collect();items.push({kind:'dialogue',data:{practice:'speaking',text:'',meaning:''}});changed();render();list.lastElementChild?.querySelector('textarea')?.focus();})]),list]));
 const footer=el('div',{class:'simple-footer'},[act('Lưu bản nháp',()=>save(false)),act('Xem như học sinh',show),act('Cho học sinh xem',()=>save(true),true)]);
 adminModeHeader(host,lesson,catalog,'speak',set.id);document.querySelector('main>h1').textContent='Luyện nói';
 host.append(el('div',{class:'admin-speaking-toolbar'},[status,el('a',{class:'btn btn-secondary',href:'?lesson='+set.lesson_id+'&mode=speak&upload=1',text:'Thêm tài liệu Word'}),act('Xem như học sinh',show),act('Tiếp tục soạn',back)]),edit,preview,footer);
 edit.addEventListener('input',changed);window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 if(add){items.push({kind:'dialogue',data:{practice:'speaking',text:'',meaning:''}});dirty=true;}notice('');render();
}
