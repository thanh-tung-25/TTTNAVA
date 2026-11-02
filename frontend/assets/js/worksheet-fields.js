import {el} from './api.js';
export const lines=text=>text.split('\n').map(s=>s.trim()).filter(Boolean);
function field(form,label,name,value='',type='textarea'){
 const control=el(type==='textarea'?'textarea':type==='select'?'select':'input',{name,class:type==='textarea'?'textarea':'input',...(type==='input'?{type:'text'}:{})});
 if(type!=='select')control.value=value;form.append(el('label',{class:'field'},[el('span',{text:label}),control]));return control;
}
export function answerFields(item){
 const form=el('div',{class:'worksheet-fields'}),c=item.config||{},a=item.answer||{};
 if(['fill','word'].includes(item.type)){
  field(form,'Đáp án đúng (mỗi dòng một cách trả lời được chấp nhận)','accepted',(a.accepted||[]).join('\n'));
  if(item.type==='word')field(form,'Đơn vị (ví dụ: bông hoa, cm)','unit',c.unit||'','input');
 }else if(item.type==='choice'){
  field(form,'Các lựa chọn (mỗi dòng một lựa chọn)','options',(c.options||[]).join('\n'));
  const correct=field(form,'Lựa chọn đúng','index','','select');for(let n=0;n<6;n++)correct.append(el('option',{value:n,text:'Lựa chọn '+(n+1)}));correct.value=a.index??0;
 }else if(item.type==='compare'){
  const correct=field(form,'Dấu đúng','value','','select');['<','>','='].forEach(v=>correct.append(el('option',{value:v,text:v})));correct.value=a.value||'=';
 }else if(item.type==='blanks'){
  field(form,'Tên các ô trống (mỗi dòng một ô)','labels',(c.labels||[]).join('\n'));
  field(form,'Đáp án của từng ô, theo đúng thứ tự trên','values',(a.values||[]).join('\n'));
 }else if(item.type==='ordering')field(form,'Nhập các thẻ theo ĐÚNG thứ tự (mỗi dòng một thẻ). Web sẽ đảo thứ tự khi học sinh làm.','values',(a.values||[]).join('\n'));
 else if(item.type==='matching')field(form,'Các cặp đúng (mỗi dòng: vế trái = vế phải)','pairs',(c.left||[]).map((left,n)=>left+' = '+a.values?.[n]).join('\n'));
 else if(item.type==='column'){
  field(form,'Số thứ nhất','a',c.a??'','input');field(form,'Số thứ hai','b',c.b??'','input');
  const op=field(form,'Phép tính','operator','','select');['+','-'].forEach(v=>op.append(el('option',{value:v,text:v})));op.value=c.operator||'+';
  form.append(el('p',{class:'muted',text:'Hệ thống tự tính đáp án và dựng phép tính theo cột.'}));
 }else form.append(el('p',{class:'muted',text:'Học sinh viết hoặc vẽ bài giải. Giáo viên chấm trong mục Bài chờ chấm.'}));
 return form;
}
export function collectFields(type,form){
 const get=name=>form.querySelector('[name='+name+']')?.value||'';
 if(['fill','word'].includes(type))return {config:type==='word'?{unit:get('unit')}:{},answer:{accepted:lines(get('accepted'))}};
 if(type==='choice')return {config:{options:lines(get('options'))},answer:{index:Number(get('index'))}};
 if(type==='compare')return {config:{},answer:{value:get('value')}};
 if(type==='blanks')return {config:{labels:lines(get('labels'))},answer:{values:lines(get('values'))}};
 if(type==='ordering'){const values=lines(get('values'));return {config:{tokens:values},answer:{values}};}
 if(type==='matching'){
  const pairs=lines(get('pairs')).map(line=>{const n=line.lastIndexOf('=');if(n<1)throw new Error('Mỗi cặp cần có dấu = giữa hai vế.');return [line.slice(0,n).trim(),line.slice(n+1).trim()];});
  return {config:{left:pairs.map(p=>p[0]),targets:[...new Set(pairs.map(p=>p[1]))]},answer:{values:pairs.map(p=>p[1])}};
 }
 if(type==='column'){if(!get('a').trim()||!get('b').trim())throw new Error('Nhập đủ hai số của phép tính.');return {config:{a:Number(get('a')),b:Number(get('b')),operator:get('operator')},answer:{}};}
 return {config:{},answer:{}};
}
