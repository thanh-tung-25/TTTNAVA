import {request,el,root,button,card,field,values,notice} from '/assets/js/chinese-common.js';
import {activityTemplate} from '/assets/js/chinese-activity-templates.js';
import {mountPractice} from '/assets/js/chinese-applied-practice.js';

const types=[['order','Xếp câu'],['fix','Sửa lỗi'],['fill','Điền từ'],['dialogue','Hội thoại']];
const lines=value=>String(value||'').split('\n').map(s=>s.trim()).filter(Boolean);
export async function activitiesEditor(lesson){
 let pack=await request('/lessons/'+lesson.id+'/activities'),dirty=false;
 const list=el('div'),preview=el('div'),topic=field('Chủ đề lượt luyện','topic',pack.topic),status=el('p',{class:'simple-status'});
 const collect=()=>{pack.topic=topic.querySelector('input').value;list.querySelectorAll('form[data-index]').forEach(form=>{const item=pack.tasks[Number(form.dataset.index)],data=values(form);for(const [key,value]of Object.entries(data))item[key]=['tokens','options'].includes(key)?lines(value):value;});};
 const act=(text,fn,primary=false)=>{const b=button(text,async()=>{b.disabled=true;try{await fn();}finally{b.disabled=false;}});if(primary)b.classList.add('btn-primary');return b;};
 const changed=()=>{dirty=true;preview.replaceChildren();};
 const render=()=>{
  list.replaceChildren();preview.replaceChildren();
  status.textContent=pack.status==='published'?'Đã cho học sinh xem'+(lesson.status==='published'?'':'; bài học vẫn chưa mở.'):'Bản nháp — học sinh chưa xem được.';
  if(!pack.tasks.length)list.append(el('p',{class:'muted',text:'Chưa có hoạt động. Chọn dạng bên dưới để thêm hoặc nạp mẫu có sẵn.'}));
  pack.tasks.forEach((item,index)=>{
   const box=el('details',{class:'simple-extra'}),summary=el('summary',{text:`${index+1}. ${types.find(([t])=>t===item.type)?.[1]} · ${item.prompt||'Hoạt động mới'}`});
   const form=el('form',{'data-index':index},[
    field(item.type==='fix'?'Câu sai cần sửa':item.type==='dialogue'?'Tình huống / nhiệm vụ':item.type==='fill'?'Câu có chỗ trống (dùng ___)':'Yêu cầu xếp câu','prompt',item.prompt||'','textarea')
   ]);
   if(item.type==='order')form.append(field('Các từ theo thứ tự câu đúng (mỗi dòng một từ, kể cả dấu câu)','tokens',(item.tokens||[]).join('\n'),'textarea'));
   if(item.type==='dialogue')form.append(field('Câu nói của người đối thoại','speech',item.speech||'','textarea'),field('Pinyin câu nói','pinyin',item.pinyin||''),field('Nghĩa tiếng Việt câu nói','meaning',item.meaning||'','textarea'));
   if(['fix','dialogue'].includes(item.type))form.append(field('Các lựa chọn (mỗi dòng một câu; có cả câu đúng)','options',(item.options||[]).join('\n'),'textarea'));
   form.append(field(item.type==='fill'?'Từ / cụm từ đáp án':'Đáp án đúng (ghi nguyên nội dung)','answer',item.answer||'','textarea'));
   if(item.type==='order')form.append(field('Pinyin câu đúng','pinyin',item.pinyin||''));
   form.append(field('Gợi ý (không bắt buộc)','hint',item.hint||'','textarea'),field('Lời giải sau khi kiểm tra','explanation',item.explanation||'','textarea'));
   if(item.type==='order'){
    const answer=form.querySelector('[name=answer]'),tokens=form.querySelector('[name=tokens]');answer.readOnly=true;
    tokens.addEventListener('input',()=>{answer.value=lines(tokens.value).join('');});
    form.append(el('p',{class:'muted',text:'Đáp án xếp câu tự ghép từ các từ theo thứ tự bạn nhập. Học sinh sẽ thấy các từ được trộn.'}));
   }
   const up=act('↑ Lên',()=>{collect();[pack.tasks[index-1],pack.tasks[index]]=[pack.tasks[index],pack.tasks[index-1]];changed();render();});up.disabled=index===0;
   const down=act('↓ Xuống',()=>{collect();[pack.tasks[index+1],pack.tasks[index]]=[pack.tasks[index],pack.tasks[index+1]];changed();render();});down.disabled=index===pack.tasks.length-1;
   box.append(summary,form,el('div',{class:'simple-pagination'},[up,down,act('Bỏ hoạt động',()=>{if(!confirm('Bỏ hoạt động này? Thay đổi chỉ được lưu khi bấm nút Lưu.'))return;collect();pack.tasks.splice(index,1);changed();render();})]));
   list.append(box);
  });
 };
 const form=el('form',{},[field('Dạng hoạt động','type','order','text',types)]);
 form.append(act('Thêm hoạt động',()=>{collect();if(pack.tasks.length>=100)throw Error('Mỗi bài tối đa 100 hoạt động.');pack.tasks.push({type:values(form).type,prompt:'',answer:'',explanation:'',hint:'',tokens:[],options:[]});changed();render();const last=list.lastElementChild;last.open=true;last.querySelector('textarea')?.focus();}));
 const template=activityTemplate(lesson);
 const save=async statusValue=>{
  collect();
  if(statusValue==='published'&&!confirm('Xác nhận đã kiểm tra nội dung và đáp án? Hoạt động này sẽ thay nội dung đang hiển thị khi bài học và tài liệu được mở cho học sinh.'))return;
  if(statusValue==='draft'&&pack.status==='published'&&!confirm('Lưu bản nháp sẽ ẩn các hoạt động vận dụng của bài này với học sinh. Tiếp tục?'))return;
  pack=await request('/lessons/'+lesson.id+'/activities','PUT',{...pack,status:statusValue});dirty=false;render();notice(statusValue==='published'?'Đã lưu và cho học sinh xem. Nếu bài học hoặc tài liệu còn là bản nháp, hãy mở chúng trước.':'Đã lưu bản nháp.');
 };
 const tryPreview=async()=>{
  collect();const validated=await request('/lessons/'+lesson.id+'/activities/preview','POST',{...pack,status:'published'});preview.replaceChildren(el('h2',{text:'Xem thử như học sinh'}));mountPractice(preview,validated);preview.scrollIntoView({block:'start',behavior:'smooth'});
 };
 root().append(el('a',{class:'btn btn-secondary',href:'?lesson='+lesson.id,text:'← Quay lại bài học'}),el('h2',{text:'Hoạt động vận dụng — '+lesson.title}),status,
  el('p',{class:'simple-intro',text:'Nội dung dùng chung cho các tài liệu trong bài. Lưu nháp để soạn tiếp; xem thử rồi cho học sinh xem khi đã kiểm tra đáp án.'}),
  card('Nội dung lượt luyện',[topic,list,form,...(template?[act('Nạp mẫu Q1 cho bài này',()=>{collect();if(pack.tasks.length&&!confirm('Thay nội dung đang soạn bằng mẫu Q1? Chỉ thay bản đang sửa, chưa lưu.'))return;pack={...pack,...structuredClone(template)};topic.querySelector('input').value=pack.topic;changed();render();notice('Đã nạp mẫu vào bản đang sửa. Xem thử rồi bấm Lưu.');})]:[])]),
  el('div',{class:'simple-footer activities-actions'},[act('Lưu bản nháp',()=>save('draft')),act('Xem thử',tryPreview),act('Cho học sinh xem',()=>save('published'),true)]),preview);
 topic.addEventListener('input',changed);list.addEventListener('input',changed);
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 notice('');render();
}
