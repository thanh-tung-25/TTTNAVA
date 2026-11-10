import {api,el} from './api.js';
import {initPage} from './ui-core.js';
export {el};
export const request=async(path='',options)=>(await api('/api/v1/experience'+path,options)).data;
export const link=(text,href,primary=false)=>el('a',{class:'btn '+(primary?'':'btn-ghost'),href,text});
export const card=(title,...children)=>el('section',{class:'experience-card'},[el('h2',{text:title}),...children]);
export const message=(text,error=false)=>{const box=document.getElementById('experience-notice');if(box){box.textContent=text;box.classList.toggle('form-error',error);box.hidden=!text;}};
export const action=(text,fn,primary=false)=>{const b=el('button',{type:'button',class:'btn '+(primary?'':'btn-ghost'),text});b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){message(e.message,true);}finally{b.disabled=false;}};return b;};
export function input(label,attributes={}){const {multiline,...attrs}=attributes,node=el(multiline?'textarea':'input',{class:'input',...attrs});node.id||='field-'+Math.random().toString(36).slice(2);return {node,wrap:el('div',{class:'field'},[el('label',{for:node.id,text:label}),node])};}
export async function boot(active='home'){const p=await initPage('student',active);document.body.dataset.program=p.course?.kind||'';return p;}
export function applyPreferences(prefs){
 document.documentElement.dataset.studentFont=prefs.font_scale||'normal';document.documentElement.dataset.studentEffects=Number(prefs.effects_enabled)===0?'off':'on';window.ttnavaSpeechRate=Number(prefs.speech_rate)||1;
 for(const frame of ['frame-lilac','frame-mint','frame-gold'])document.body.classList.toggle(frame,prefs.equipped_frame===frame);
 for(const room of ['room-garden','room-space','room-ocean'])document.body.classList.toggle(room,prefs.equipped_background===room);
}
export async function onboarding(profile,{force=false}={}){
 const [prefs,catalog]=await Promise.all([request('/preferences'),request('/catalog')]);applyPreferences(prefs);if(prefs.onboarding_at&&!force)return;
 const dialog=el('dialog',{class:'experience-dialog'}),minutes=el('select',{class:'select','aria-label':'Thời gian học mỗi buổi'},[5,10,15].map(n=>el('option',{value:n,text:n+' phút'})));minutes.value=String(prefs.minutes);
 const focus=el('select',{class:'select','aria-label':'Bài đang học trên lớp'},[el('option',{value:'',text:'Mình chưa chọn bài cụ thể'}),...catalog.items.map(i=>el('option',{value:i.id,text:(i.section?i.section+' · ':'')+i.name}))]);focus.value=catalog.focus.topic_id||catalog.focus.set_id||'';
 const status=el('p',{role:'status'}),close=action('Để sau',()=>dialog.close()),save=action('Lưu góc học của mình',async()=>{try{await request('/focus',{method:'PUT',body:{itemId:focus.value||null}});await request('/preferences',{method:'PUT',body:{minutes:Number(minutes.value),onboarded:true}});dialog.close();location.reload();}catch(e){status.textContent=e.message;}},true);
 dialog.append(el('h2',{text:'Mình chuẩn bị buổi học nhé'}),el('p',{text:'Chọn thời gian phù hợp và bài đang học. Bạn có thể đổi lại bất cứ lúc nào.'}),el('label',{text:'Mỗi buổi mình học khoảng'}),minutes,el('label',{text:'Bài đang học trên lớp'}),focus,status,el('div',{class:'experience-actions'},[close,save]));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
