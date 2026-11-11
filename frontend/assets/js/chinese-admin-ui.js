import {el,button,error} from './chinese-common.js';
export const adminDetails=(title,children)=>el('details',{class:'simple-extra'},[el('summary',{text:title}),...children]);
export const adminStatus=s=>s==='published'?'Học sinh đang xem được':s==='archived'?'Đã lưu trữ':'Bản nháp · học sinh chưa xem được';
export function adminAction(text,fn,primary=false){
 const b=button(text,async()=>{b.disabled=true;try{await fn();}catch(e){if(Array.isArray(e.details))e=new Error(e.message+'\nCần sửa:\n'+e.details.slice(0,8).map(i=>`Mục ${i.index}: ${i.message}`).join('\n'));error(e);document.querySelector('#notice')?.scrollIntoView({block:'center',behavior:'smooth'});}finally{b.disabled=false;}});
 if(primary)b.className='btn btn-primary';if(text.startsWith('Xóa'))b.classList.add('btn-danger');return b;
}
