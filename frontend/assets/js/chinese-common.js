import {api,el,toast,escapeHtml} from './api.js';
export {el,toast,escapeHtml};
export const request=async(path,method='GET',body)=> (await api('/api/v1/chinese'+path,{method,body})).data;
export const root=()=>document.querySelector('#content');
export function button(text,action){return el('button',{type:'button',class:'btn btn-secondary',text,onclick:()=>Promise.resolve().then(action).catch(error)});}
export function error(e){toast(e.message,'error');const out=document.querySelector('#notice');out.textContent=e.message+(e.details?' — '+JSON.stringify(e.details):'');out.className='notice error';}
export function notice(text){document.querySelector('#notice').textContent=text;}
export function link(text,params,role='student'){return el('a',{class:'btn btn-secondary',text,href:`/pages/${role}/chinese/?${new URLSearchParams(params)}`});}
export function card(title,children=[]){return el('section',{class:'card'},[el('h2',{text:title}),...children]);}
export function field(label,name,value='',type='text',options){
 const input=options?el('select',{name},options.map(([v,t])=>el('option',{value:v,text:t}))):el(type==='textarea'?'textarea':'input',{name,type:type==='textarea'?undefined:type});
 input.value=value??'';return el('label',{class:'chinese-field'},[el('span',{text:label}),input]);
}
export const statuses=[['draft','Bản nháp'],['published','Xuất bản'],['archived','Lưu trữ']];
export const kinds=[['vocabulary','Từ vựng'],['grammar','Ngữ pháp'],['dialogue','Hội thoại'],['reading','Bài đọc'],['question','Câu hỏi'],['unknown','Chưa xác định']];
export function table(headers,rows){
 const head=el('thead',{},[el('tr',{},headers.map(t=>el('th',{text:t})))]);
 const cells=rows.length?rows.map(row=>el('tr',{},row.map(v=>el('td',{},[v instanceof Node?v:String(v??'')])))):[el('tr',{},[el('td',{colspan:headers.length,text:'Chưa có nội dung'})])];
 return el('div',{class:'table-scroll'},[el('table',{},[head,el('tbody',{},cells)])]);
}
export const values=form=>Object.fromEntries(new FormData(form));
export function formSubmit(form,action,text='Lưu'){form.append(el('button',{class:'btn btn-primary',type:'submit',text}));form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('[type=submit]');b.disabled=true;try{await action(values(form));notice('Đã lưu thành công');}catch(e){error(e);}finally{b.disabled=false;}});return form;}
export function percentage(setId,data){
 const p=data.progress.find(p=>p.set_id===setId), reads=p?(typeof p.read_items==='string'?JSON.parse(p.read_items):p.read_items):[];
 const counts=data.counts.filter(c=>c.set_id===setId), total=counts.filter(c=>c.kind!=='unknown').reduce((n,c)=>n+Number(c.total),0);
 // Filled by server: unique reviewed vocabulary, read passages and locked practice questions.
 const done=data.completion?.find(c=>c.set_id===setId)?.done??reads.length;
 return total?Math.min(100,Math.round(done/total*100)):0;
}
