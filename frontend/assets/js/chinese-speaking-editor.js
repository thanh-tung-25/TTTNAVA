import {request,el,root,button,card,field,values,notice,error} from './chinese-common.js';
import {questionAudio,stopQuestionAudio} from './question-audio.js';
import {mountAdminStudentPreview} from './chinese-admin-preview.js';
import {adminModeHeader} from './chinese-admin-modes.js';
import {speakingQuestions,speakingSettings,speakingAssessmentEnabled,SPEAKING_LIMIT} from './chinese-speaking-data.js';
import {speakingResultStyles} from './chinese-speaking-results.js';

export async function speakingEditor(result,{lesson,profile,catalog,add=false}){
 speakingResultStyles();
 const set=result.set;let items=result.items.map(i=>({...i,data:{...i.data}})),dirty=false,dispose,inherited=false;
 const bank=()=>items.filter(i=>i.kind==='dialogue'&&i.data.practice==='speaking');
 if(!bank().length&&!add&&items.length&&!items.some(i=>i.kind==='unknown')){
  const pack=await request('/lessons/'+lesson.id+'/activities');
  if(pack.status==='published'){
   const source=[...new Map((pack.tasks||[]).flatMap(t=>speakingQuestions({tasks:[t]})).map(q=>[q.text,q])).values()];
   items.push(...source.map(q=>({kind:'dialogue',data:{practice:'speaking',text:q.text}})));inherited=source.length>0;
  }
 }
 if(!bank().some(i=>i.data.speaking_selected!==undefined))bank().forEach((i,n)=>{i.data.speaking_selected=n<3;});
 const defaults=speakingSettings(set),host=root(),list=el('div',{class:'admin-speaking-list'}),preview=el('div',{hidden:true}),status=el('p',{class:'simple-status'}),title=field('Tên tài liệu luyện nói','title',set.title);
 const edit=el('div',{class:'admin-speaking-edit'}),count=el('span',{class:'admin-speaking-count'}),summary=el('p',{class:'admin-speaking-session-summary'});
 const duration=field('Thời lượng một lượt ghi âm','duration_seconds',defaults.duration_seconds,'text',[30,60,90,120,150,180,210,240,270,300].map(n=>[n,n+' giây'+(n===90?' · đề xuất':'')]));
 const order=field('Thứ tự học sinh nghe','order',defaults.order,'text',[['sequential','Theo thứ tự cô sắp xếp'],['free','Học sinh được chọn thứ tự nghe']]);
 const ai=el('input',{type:'checkbox',name:'ai_assessment'});ai.checked=speakingAssessmentEnabled(set);
 const settings=el('form',{class:'admin-speaking-settings',onsubmit:e=>e.preventDefault()},[duration,order,el('label',{class:'admin-speaking-ai-toggle'},[ai,el('span',{text:'AI chấm bài và gửi kết quả cho cô'})]),el('p',{class:'admin-import-note',text:'Chỉ lưu điểm và nhận xét. Học sinh tự chọn tải bản ghi; chấm AI hoạt động khi dịch vụ đã được kết nối.'})]);
 const selected=()=>bank().filter(i=>i.data.speaking_selected!==false);
 const config=()=>({duration_seconds:Number(values(settings).duration_seconds),order:values(settings).order,...(ai.checked||speakingAssessmentEnabled(set)?{ai_assessment:ai.checked}:{})});
 const quick=field('Chọn nhanh số câu đầu','count',selected().length||1,'number');quick.querySelector('input').min=1;
 const act=(text,fn,primary=false)=>{const b=button(text,async()=>{b.disabled=true;try{await fn();}catch(e){const details=Array.isArray(e.details)?e.details.map(d=>`Mục ${d.index}: ${d.message}`).join('\n'):'';error(new Error(e.message+(details?'\n'+details:'')));}finally{b.disabled=false;}});if(primary)b.classList.add('btn-primary');return b;};
 const collect=()=>list.querySelectorAll('form[data-index]').forEach(form=>{const item=items[Number(form.dataset.index)];for(const [key,value]of Object.entries(values(form)))item.data[key]=value.trim();});
 const changed=()=>{dirty=true;};
 const totals=()=>{count.textContent=`${selected().length}/${bank().length} câu được giao`;summary.textContent=`Một lượt ghi âm · ${config().duration_seconds} giây · ${selected().length} câu hỏi · mỗi câu được nghe 2 lần`;quick.querySelector('input').max=Math.max(1,Math.min(SPEAKING_LIMIT,bank().length));};
 const render=()=>{
  list.replaceChildren();totals();status.textContent=set.status==='published'?(set.lesson_status==='published'?'Học sinh đang xem được':'Đã duyệt tài liệu · bài học chưa mở'):'Bản nháp · học sinh chưa xem được';status.classList.toggle('published',set.status==='published'&&set.lesson_status==='published');
  const positions=items.map((item,index)=>({item,index})).filter(({item})=>item.data.practice==='speaking'||item.kind==='unknown');let number=0;
  for(const {index,item}of positions){
   const form=el('form',{'data-index':index}),box=el('article',{class:'admin-speaking-question'}),isQuestion=item.data.practice==='speaking';
   const heading=el('div',{class:'admin-speaking-question-head'}),tools=el('div',{class:'admin-speaking-row-tools'});heading.append(el('strong',{text:isQuestion?`Câu ${++number}`:'Đoạn cần kiểm tra'}));
   if(isQuestion){
    const input=el('input',{type:'checkbox','aria-label':'Giao câu '+number});input.checked=item.data.speaking_selected!==false;input.onchange=()=>{item.data.speaking_selected=input.checked;changed();totals();};heading.append(el('label',{class:'admin-speaking-pick'},[input,el('span',{text:'Giao câu này'})]));
    const indices=items.map((i,n)=>i.data.practice==='speaking'?n:-1).filter(n=>n>=0),at=indices.indexOf(index);
    for(const [label,delta]of [['↑ Lên',-1],['↓ Xuống',1]]){const b=act(label,()=>{collect();const target=indices[at+delta];[items[index],items[target]]=[items[target],items[index]];changed();render();});b.disabled=at+delta<0||at+delta>=indices.length;tools.append(b);}
   }
   tools.append(act('Bỏ câu',()=>{collect();items.splice(index,1);changed();render();}));heading.append(tools);box.append(heading);
   if(isQuestion){
    const question=field('Câu hỏi tiếng Trung','text',item.data.text,'textarea');question.querySelector('textarea').maxLength=180;
    form.append(question,field('Nghĩa tiếng Việt (chỉ để cô kiểm tra)','meaning',item.data.meaning||'','textarea'),field('Đáp án tham khảo cho AI (không bắt buộc)','answer_reference',item.data.answer_reference||'','textarea'),field('Tiêu chí chấm / từ cần dùng (không bắt buộc)','assessment_notes',item.data.assessment_notes||'','textarea'));
    box.append(form,questionAudio(()=>form.querySelector('[name=text]').value,{language:'zh-CN'}));
    if(! /\p{Script=Han}/u.test(item.data.text||'')||(item.data.text||'').length>180)box.append(el('p',{class:'admin-source-warning',text:'Cần nhập câu tiếng Trung, tối đa 180 ký tự trước khi đăng.'}));
   }else box.append(el('p',{class:'admin-source-warning',text:'Đoạn chưa nhận diện: '+item.data.text}),el('p',{text:'Hãy sửa định dạng Word hoặc bỏ đoạn này trước khi cho học sinh xem.'}));
   list.append(box);
  }
  if(!positions.length)list.append(el('p',{class:'simple-empty',text:'Chưa có câu hỏi. Thêm câu tiếng Trung hoặc nhập Word trong mục Luyện nói.'}));
 };
 const show=()=>{collect();stopQuestionAudio();dispose?.();edit.hidden=true;preview.hidden=false;footer.hidden=true;dispose=mountAdminStudentPreview(preview,{set:{...set,title:title.querySelector('input').value,speaking_settings:config()},items,activities:null,profile,mode:'speak'});preview.scrollIntoView({block:'start',behavior:'smooth'});};
 const back=()=>{stopQuestionAudio();dispose?.();dispose=null;preview.replaceChildren();preview.hidden=true;edit.hidden=false;footer.hidden=false;};
 const save=async publish=>{
  collect();
  if(publish&&(!selected().length||selected().length>SPEAKING_LIMIT))throw Error(`Chọn từ 1 đến ${SPEAKING_LIMIT} câu cho một lượt ghi âm trước khi đăng.`);
  if(!publish&&set.status==='published'&&!confirm('Lưu bản nháp sẽ ẩn tài liệu này với học sinh. Tiếp tục?'))return;
  if(publish&&!confirm(`Cho học sinh xem bài luyện nói ${selected().length} câu trong ${config().duration_seconds} giây ở ${set.lesson_title}?`))return;
  await request('/sets/'+set.id,'PUT',{title:title.querySelector('input').value,status:publish?'published':'draft',speaking_settings:config(),items});
  if(publish&&set.lesson_status!=='published')await request('/lessons/'+lesson.id,'PUT',{...lesson,description:lesson.description||'',image_url:lesson.image_url||'',status:'published'});
  dirty=false;location.href='?lesson='+set.lesson_id+'&mode=speak';
 };
 const choose=act('Áp dụng số câu',()=>{const value=Number(quick.querySelector('input').value);if(!Number.isInteger(value)||value<1||value>Math.min(SPEAKING_LIMIT,bank().length))throw Error('Số câu chưa hợp lệ.');collect();bank().forEach((item,n)=>{item.data.speaking_selected=n<value;});changed();render();});
 const addQuestion=()=>{collect();items.push({kind:'dialogue',data:{practice:'speaking',text:'',meaning:'',speaking_selected:selected().length<SPEAKING_LIMIT}});changed();render();list.lastElementChild?.querySelector('textarea')?.focus();};
 edit.append(card('Giao bài nghe – trả lời bằng ghi âm',[title,settings,summary,el('div',{class:'admin-speaking-quick'},[quick,choose]),el('p',{class:'admin-import-note',text:'Chọn các câu muốn giao và dùng nút Lên/Xuống để sắp xếp. Học sinh ghi âm liên tục, nghe lại hoặc ghi âm lại toàn bộ bài, rồi gửi AI chấm. Tải bản ghi là tùy chọn.'})]),card('Câu hỏi giao trong lượt ghi âm',[
  ...(inherited?[el('p',{class:'admin-import-note',text:'Đã lấy câu hỏi từ Hội thoại đang đăng của bài để cô chọn. Lưu hoặc đăng để áp dụng bộ câu này.'})]:set.document_id?[el('p',{class:'admin-import-note',text:'Nguồn Word: '+(set.filename||set.title)}),el('a',{href:'/api/v1/chinese/documents/'+set.document_id,text:'Tải file Word gốc'})]:[]),
  el('div',{class:'admin-speaking-toolbar'},[count,act('+ Thêm câu tiếng Trung',addQuestion)]),list
 ]));
 const footer=el('div',{class:'simple-footer'},[act('Lưu bản nháp',()=>save(false)),act('Xem như học sinh',show),act('Cho học sinh xem',()=>save(true),true)]);
 adminModeHeader(host,lesson,catalog,'speak',set.id);document.querySelector('main>h1').textContent='Luyện nói';
 host.append(el('div',{class:'admin-speaking-toolbar'},[status,el('a',{class:'btn btn-secondary',href:'?lesson='+set.lesson_id+'&mode=speak&upload=1',text:'Thêm tài liệu Word'}),act('Xem như học sinh',show),act('Tiếp tục soạn',back)]),edit,preview,footer);
 edit.addEventListener('input',changed);settings.addEventListener('change',()=>{changed();totals();});window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 if(add)addQuestion();notice('');render();
}
