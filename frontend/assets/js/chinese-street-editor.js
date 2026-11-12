import {el,field} from './chinese-common.js';
import {streetPlaces} from './chinese-street-places.js';
export function renderStreetEditor(host,{data,index,onPreview,onSave,onError}){
 const m=data.missions[index],details=el('details',{class:'street-editor',open:true},[el('summary',{text:'✎ Soạn ngay nhiệm vụ đang xem'})]),form=el('form');
 const enabled=el('input',{type:'checkbox'});enabled.checked=data.enabled;enabled.onchange=()=>{data.enabled=enabled.checked;};
 form.append(el('label',{class:'street-enable'},[enabled,'Mở phần này cho học sinh (bài học cần được xuất bản)']));
 const place=field('Đặt bài tại địa điểm','place_id',data.place_id,'text',streetPlaces.map(p=>[p.id,p.name]));place.querySelector('select').onchange=e=>{data.place_id=e.target.value;};form.append(place);
 function bind(label,key,type='text',limit=200){const f=field(label,key,m[key],type),input=f.querySelector('input,textarea');input.maxLength=limit;input.required=true;input.oninput=()=>{m[key]=input.value;};form.append(f);return input;}
 bind('Tên nhiệm vụ','title','text',80);bind('Hướng dẫn ngắn','instruction','textarea',200);bind('Câu nghe tiếng Trung','speech','textarea',240);
 const type=field('Cách trả lời','type',m.type,'text',[['choice','Chọn câu trả lời'],['map','Chạm địa điểm trên bản đồ']]);
 type.querySelector('select').onchange=e=>{m.type=e.target.value;m.options=m.type==='map'?[]:[1,2,3].map(i=>({id:'c'+i,label:'Lựa chọn '+i}));m.answer=m.type==='map'?'school':'c1';onPreview(index);};form.append(type);
 if(m.type==='choice'){
  m.options.forEach((o,i)=>{const f=field('Lựa chọn '+String.fromCharCode(65+i),'option-'+o.id,o.label);const input=f.querySelector('input');input.maxLength=100;input.required=true;input.oninput=()=>{o.label=input.value;};form.append(f);});
  const tools=el('div',{class:'street-editor-tools'});
  if(m.options.length<4)tools.append(el('button',{type:'button',class:'btn btn-secondary',text:'+ Thêm lựa chọn',onclick:()=>{m.options.push({id:crypto.randomUUID(),label:'Lựa chọn mới'});onPreview(index);}}));
  if(m.options.length>2)tools.append(el('button',{type:'button',class:'btn btn-secondary',text:'Bỏ lựa chọn cuối',onclick:()=>{const removed=m.options.pop();if(m.answer===removed.id)m.answer=m.options[0].id;onPreview(index);}}));form.append(tools);
 }
 const answer=field('Đáp án đúng (chỉ admin thấy)','answer',m.answer,'text',m.type==='map'?streetPlaces.map(p=>[p.id,p.name]):m.options.map((o,i)=>[o.id,'Lựa chọn '+String.fromCharCode(65+i)]));answer.querySelector('select').onchange=e=>{m.answer=e.target.value;};form.append(answer);
 bind('Giải thích sau khi trả lời đúng','feedback','textarea',600);
 const actions=el('div',{class:'street-editor-tools'}),preview=el('button',{type:'button',class:'btn btn-secondary',text:'Xem thử phần vừa sửa',onclick:()=>onPreview(index)}),save=el('button',{type:'submit',class:'btn btn-primary',text:'Lưu nhiệm vụ cho bài này'});actions.append(preview,save);form.append(actions,el('p',{class:'street-note',text:'Các mục thay đổi chỉ đến học sinh sau khi bấm Lưu. Xem thử không ghi tiến độ hoặc sao.'}));
 form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await onSave();}catch(e){onError(e);}finally{save.disabled=false;}};
 details.append(form);host.append(details);
 const tools=el('div',{class:'street-editor-tools'});
 if(data.missions.length<6)tools.append(el('button',{type:'button',class:'btn btn-secondary',text:'+ Thêm nhiệm vụ',onclick:()=>{data.missions.push({id:crypto.randomUUID(),title:'Nhiệm vụ mới',instruction:'Nghe rồi chọn câu trả lời phù hợp.',speech:'你好！',type:'choice',options:[{id:'c1',label:'你好！'},{id:'c2',label:'再见！'},{id:'c3',label:'谢谢！'}],answer:'c1',feedback:'你好！ là lời chào; con đáp lại bằng 你好！ nhé.',progress:{completed:false,stars:0}});onPreview(data.missions.length-1);}}));
 if(data.missions.length>1)tools.append(el('button',{type:'button',class:'btn btn-secondary',text:'Bỏ nhiệm vụ đang xem',onclick:()=>{data.missions.splice(index,1);onPreview(Math.max(0,index-1));}}));host.append(tools);
}
