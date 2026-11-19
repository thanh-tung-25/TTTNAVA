import {api,el} from './api.js';
import {semesterName} from './primary-subjects.js';
export function lessonContents(data){
 const content=data.content,root=el('div',{class:'school-lesson-reading'});
 const title=['tieng-anh','tieng-viet'].includes(data.subjectId)?data.chapterName+' · '+data.name:data.name;
 root.append(el('p',{class:'school-lesson-breadcrumb',text:['Lớp '+data.grade,data.subjectName,semesterName(data.semester),data.chapterName].join(' · ')}),el('h1',{text:title}));
 if(content.objectives?.length)root.append(el('section',{class:'lesson-objectives'},[el('h2',{text:'Sau bài học này'}),el('ul',{},content.objectives.map(text=>el('li',{text})))]));
 const theory=el('section',{id:'lesson-theory',class:'lesson-theory','aria-label':'Kiến thức bài học'});
 if(content.listening?.text&&'speechSynthesis' in window){
  const text=content.listening.text,button=el('button',{type:'button',class:'btn btn-ghost',text:'Nghe đoạn tiếng Anh'}),message=el('p',{class:'muted',role:'status'});
  button.onclick=()=>{
   if(window.speechSynthesis.speaking){window.speechSynthesis.cancel();button.textContent='Nghe đoạn tiếng Anh';return;}
   const voice=window.speechSynthesis.getVoices().find(voice=>voice.localService&&voice.lang.startsWith('en'));
   if(!voice){message.textContent='Thiết bị chưa có giọng tiếng Anh cục bộ. Bạn vẫn có thể đọc kịch bản bên dưới.';return;}
   const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.85;
   utterance.onend=utterance.onerror=()=>button.textContent='Nghe đoạn tiếng Anh';button.textContent='Dừng nghe';message.textContent='';window.speechSynthesis.speak(utterance);
  };
  theory.append(button,message);window.addEventListener('pagehide',()=>window.speechSynthesis.cancel(),{once:true});
 }
 for(const section of content.sections||[])theory.append(el('article',{class:'lesson-section'},[el('h2',{text:section.heading}),el('p',{class:'lesson-text',text:section.body})]));
 root.append(theory);
 if(content.example)root.append(el('section',{id:'lesson-example',class:'lesson-example'},[el('p',{class:'eyebrow',text:'CÙNG ÁP DỤNG'}),el('h2',{text:'Ví dụ có hướng dẫn'}),el('p',{class:'lesson-text',text:content.example.prompt}),el('details',{},[el('summary',{text:'Xem cách làm và giải thích'}),el('p',{class:'lesson-text',text:content.example.solution})])]));
 if(content.sources?.length)root.append(el('details',{class:'lesson-sources'},[el('summary',{text:'Tài liệu tham khảo'}),el('p',{text:'Nội dung được biên soạn cho bài học này.'}),el('ul',{},content.sources.map(source=>{try{const url=new URL(source.url);if(!['http:','https:'].includes(url.protocol))return el('li',{text:source.title});return el('li',{},[el('a',{href:url.href,target:'_blank',rel:'noopener noreferrer',text:source.title})]);}catch{return el('li',{text:source.title});}}))]));
 return root;
}
export async function previewSchoolLesson(id){
 if(!document.querySelector('[data-lesson-style]')){const styleUrl=new URL('/assets/css/school-lesson.css',import.meta.url),release=new URL(import.meta.url).searchParams.get('release');if(release)styleUrl.searchParams.set('release',release);document.head.append(el('link',{rel:'stylesheet',href:styleUrl.href,'data-lesson-style':''}));}
 const dialog=el('dialog',{class:'lesson-preview-dialog'}),status=el('p',{role:'status',text:'Đang mở bài học…'});
 dialog.append(el('button',{class:'btn btn-ghost lesson-preview-close',type:'button',text:'Đóng',onclick:()=>dialog.close()}),status);dialog.onclose=()=>{window.speechSynthesis?.cancel();dialog.remove();};document.body.append(dialog);dialog.showModal();
 try{const {data}=await api('/api/v1/school-lessons/'+encodeURIComponent(id));if(dialog.open){const reading=lessonContents(data),edit=el('button',{class:'btn btn-ghost',type:'button',text:'Sửa bài giảng',onclick:()=>editLesson(dialog,data,reading,edit)});status.replaceWith(edit,reading);}}catch(error){status.textContent=error.message;}
}
function editLesson(dialog,data,reading,edit){
 const form=el('form',{class:'lesson-editor'}),fields=[];
 const input=(label,value,max=20000)=>{const field=el('textarea',{class:'textarea',rows:5,maxlength:max,required:true,value});field.value=value;form.append(el('label',{class:'field'},[el('span',{text:label}),field]));return field;};
 form.append(el('h2',{text:'Biên tập bài giảng'}));
 const objectives=input('Mục tiêu (mỗi dòng một mục tiêu)',data.content.objectives.join('\n'),7200);
 for(const [index,section]of data.content.sections.entries())fields.push({heading:input('Tên phần '+(index+1),section.heading,200),body:input('Nội dung phần '+(index+1),section.body)});
 const prompt=input('Đề ví dụ',data.content.example.prompt,10000),solution=input('Cách làm và giải thích',data.content.example.solution),status=el('p',{role:'status'}),save=el('button',{class:'btn btn-primary',type:'submit',text:'Lưu bài giảng'}),cancel=el('button',{class:'btn btn-ghost',type:'button',text:'Hủy',onclick:()=>{form.remove();reading.hidden=false;edit.hidden=false;}});
 form.append(status,el('div',{class:'lesson-editor-actions'},[save,cancel]));reading.hidden=true;edit.hidden=true;dialog.append(form);
 form.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{const content={objectives:objectives.value.split('\n').map(value=>value.trim()).filter(Boolean),sections:fields.map(field=>({heading:field.heading.value,body:field.body.value})),example:{prompt:prompt.value,solution:solution.value}};await api('/api/v1/school-lessons/'+encodeURIComponent(data.id),{method:'PUT',body:content});Object.assign(data.content,content);const next=lessonContents(data);reading.replaceWith(next);form.remove();edit.remove();const nextEdit=el('button',{class:'btn btn-ghost',type:'button',text:'Sửa bài giảng',onclick:()=>editLesson(dialog,data,next,nextEdit)});next.before(nextEdit);}catch(error){status.textContent=error.message;save.disabled=false;}};
 objectives.focus();
}
