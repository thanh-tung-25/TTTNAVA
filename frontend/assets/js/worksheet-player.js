import {el} from './api.js';
import {questionAudio} from './question-audio.js';
export const ITEM_TYPES={fill:'Điền đáp án',blanks:'Nhiều ô trống',choice:'Chọn đáp án',compare:'Chọn dấu > < =',ordering:'Sắp xếp',matching:'Nối cặp',column:'Đặt tính',word:'Toán có lời văn',drawing:'Tự luận / vẽ'};
export const imageUrl=id=>'/api/v1/worksheets/images/'+encodeURIComponent(id);
const btn=(text,fn)=>el('button',{type:'button',class:'btn btn-ghost',text,onclick:fn});
export function renderItem(item,value,onChange){
 const box=el('section',{class:'worksheet-question'},[el('span',{class:'worksheet-type',text:ITEM_TYPES[item.type]}),el('h2',{class:'worksheet-prompt',text:item.prompt})]);
 box.append(questionAudio(item.prompt,{language:item.subjectId==='tieng-anh'?'en-US':'vi-VN'}));
 if(item.imageId)box.append(el('img',{class:'worksheet-illustration',src:imageUrl(item.imageId),alt:'Hình minh họa câu hỏi'}));
 const input=(label,current,fn,numeric=false)=>{
  const i=el('input',{class:'input',type:'text',value:current??'','aria-label':label,maxlength:300,...(numeric?{inputmode:'numeric'}:{})});i.oninput=()=>fn(i.value);return el('label',{class:'worksheet-answer'},[el('span',{text:label}),i]);
 };
 if(['fill','word'].includes(item.type))box.append(input(item.type==='word'?'Đáp số'+(item.config.unit?' ('+item.config.unit+')':''):'Câu trả lời',value,onChange,true));
 else if(['choice','compare'].includes(item.type)){
  const choices=item.type==='compare'?['<','>','=']:item.config.options;
  const list=el('div',{class:'worksheet-choices',role:'group','aria-label':'Chọn đáp án'});
  choices.forEach((label,index)=>{const answer=item.type==='compare'?label:index,b=btn(label,()=>{list.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');onChange(answer);});b.setAttribute('aria-pressed',String(value===answer));list.append(b);});box.append(list);
 }else if(item.type==='blanks'){
  const values=Array.isArray(value)?[...value]:item.config.labels.map(()=> '');
  const list=el('div',{class:'worksheet-blanks'});item.config.labels.forEach((label,index)=>list.append(input(label,values[index],v=>{values[index]=v;onChange([...values]);})));box.append(list);
 }else if(item.type==='matching'){
  const values=Array.isArray(value)?[...value]:item.config.left.map(()=> '');
  item.config.left.forEach((label,index)=>{
   const select=el('select',{class:'select','aria-label':'Ghép '+label},[el('option',{value:'',text:'Chọn kết quả'}),...[...new Set(item.config.targets)].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true})).map(target=>el('option',{value:target,text:target}))]);
   select.value=values[index]||'';select.onchange=()=>{values[index]=select.value;onChange([...values]);};box.append(el('label',{class:'worksheet-pair'},[el('strong',{text:label}),el('span',{text:'→','aria-hidden':'true'}),select]));
  });
 }else if(item.type==='ordering'){
  let ordered=Array.isArray(value)?[...value]:[];const selected=el('div',{class:'worksheet-token-row'}),available=el('div',{class:'worksheet-token-row'});
  const redraw=()=>{selected.replaceChildren(...ordered.map((token,n)=>btn(token,()=>{ordered.splice(n,1);onChange([...ordered]);redraw();})));if(!ordered.length)selected.append(el('span',{class:'muted',text:'Thứ tự con chọn sẽ hiện ở đây'}));available.replaceChildren(...item.config.tokens.filter(t=>!ordered.includes(t)).map(token=>btn(token,()=>{ordered.push(token);onChange([...ordered]);redraw();})));};
  box.append(el('p',{class:'muted',text:'Bấm các thẻ theo thứ tự. Bấm lại một thẻ đã chọn để bỏ.'}),selected,available,btn('Chọn lại',()=>{ordered=[];onChange([]);redraw();}));redraw();
 }else if(item.type==='column'){
  const {a,b,operator}=item.config,result=operator==='+'?a+b:a-b,width=Math.max(String(a).length,String(b).length,String(result).length);let digits=String(value??'').padStart(width,' ').slice(-width).split('');
  const grid=el('div',{class:'worksheet-column'},[el('div',{text:String(a).padStart(width+1,' ')}),el('div',{text:operator+String(b).padStart(width,' ')})]);
  const row=el('div',{class:'worksheet-column-answer'});digits.forEach((digit,index)=>{const field=el('input',{type:'text',inputmode:'numeric',maxlength:1,value:digit.trim(),'aria-label':'Chữ số kết quả '+(index+1)});field.oninput=()=>{field.value=field.value.replace(/[^0-9]/g,'').slice(-1);digits[index]=field.value;onChange(digits.join('').trim());if(field.value)row.children[index+1]?.focus();};row.append(field);});grid.append(row);box.append(grid);
 }else if(item.type==='drawing'){
  const response=value&&typeof value==='object'?{...value}:{text:'',drawing:''};
  const canvas=el('canvas',{width:640,height:320,'aria-label':'Bảng vẽ bài làm'}),ctx=canvas.getContext('2d');let drawing=false;
  const point=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];};
  if(response.drawing){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0);img.src=response.drawing;}
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drawing=true;ctx.beginPath();ctx.moveTo(...point(e));};canvas.onpointermove=e=>{if(!drawing)return;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineTo(...point(e));ctx.stroke();};
  canvas.onpointerup=canvas.onpointercancel=()=>{if(!drawing)return;drawing=false;response.drawing=canvas.toDataURL('image/png');onChange({...response});};
  const text=el('textarea',{class:'textarea','aria-label':'Bài giải tự luận',placeholder:'Con có thể viết bài giải hoặc vẽ trên bảng bên dưới.',maxlength:6000},[response.text||'']);text.oninput=()=>{response.text=text.value;onChange({...response});};
  box.append(el('p',{class:'muted',text:'Giáo viên sẽ xem và chấm bài này.'}),text,canvas,btn('Xóa bảng',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);response.drawing='';onChange({...response});}));
 }
 return box;
}
export function resultBlock(result){
 return el('div',{class:'worksheet-feedback '+(result.correct===null?'pending':result.correct?'correct':'incorrect'),role:'status'},[
  el('strong',{text:result.correct===null?'Chờ giáo viên chấm':result.correct?'Đúng rồi!':'Mình xem lại nhé!'}),
  ...(result.correct===null?[]:[el('p',{text:'Đáp án: '+result.expected})]),
  ...(result.checks?.length>1?[el('p',{text:result.checks.filter(Boolean).length+'/'+result.checks.length+' ô đúng'})]:[]),
  ...(result.explanation?[el('p',{text:result.explanation})]:[]),...(result.comment?[el('p',{text:'Giáo viên: '+result.comment})]:[]),
 ]);
}
