import {el} from './api.js';
import {questionAudio} from './question-audio.js';
export function setupBeginnerMode(profile){
 if(document.getElementById('beginner-toggle'))return;
 const key='ttnava-beginner:'+profile.id;let enabled=false;try{enabled=localStorage.getItem(key)==='true';}catch{}
 const style=el('link',{rel:'stylesheet',href:'/assets/css/beginner.css'});document.head.append(style);
 const button=el('button',{id:'beginner-toggle',type:'button',class:'btn btn-ghost btn-sm','aria-pressed':String(enabled),text:'🌱 Bé mới học',title:'Chữ to, nút lớn và hướng dẫn cho bé mới học'});
 const enhance=()=>{
  if(!enabled)return;
  document.querySelectorAll('main .question-prompt,main .quiz-prompt,main .worksheet-prompt,main .applied-practice>h2,main .study-prompt').forEach(prompt=>{
   if(prompt.parentElement.querySelector(':scope > .beginner-instruction'))return;
   const box=el('div',{class:'beginner-instruction'},[el('img',{src:'/assets/images/mascot-panda.svg',width:64,height:64,alt:''}),el('div',{},[el('strong',{text:'Mình làm từng câu nhé!'}),el('p',{text:'Nghe đề → nghe lựa chọn → chọn câu trả lời.'}),questionAudio('Con bấm nút loa để nghe đề và từng lựa chọn. Sau đó chọn câu trả lời rồi bấm kiểm tra.',{label:'Nghe hướng dẫn'})])]);prompt.before(box);
  });
 };
 const apply=()=>{document.body.classList.toggle('beginner-mode',enabled);button.setAttribute('aria-pressed',String(enabled));if(enabled)enhance();else document.querySelectorAll('.beginner-instruction').forEach(n=>n.remove());};
 button.onclick=()=>{enabled=!enabled;try{localStorage.setItem(key,String(enabled));}catch{}apply();};
 (document.querySelector('main')||document.body).prepend(el('div',{class:'beginner-control no-print'},[button]));apply();
 const observer=new MutationObserver(enhance);observer.observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
 window.addEventListener('pagehide',()=>observer.disconnect());
}
