import {request,boot,el,card,action,link,message} from './experience-ui.js';
import {questionAudio} from './question-audio.js';
import {chineseQuestionPrompt} from './chinese-question-prompt.js';
const id=new URLSearchParams(location.search).get('run'),root=document.getElementById('experience-root');
let state,profile,saveTimer,saveChain=Promise.resolve(),collect=()=>({}),generation=0,busy=false,localKey;
const expected=f=>{const a=f.expected;if(f.type==='single_choice')return f.options.find(o=>o.key===a.key)?.text||a.key;if(f.type==='multiple_choice')return f.options.filter(o=>a.keys.includes(o.key)).map(o=>o.text).join(' · ');return a?.accepted?.join(' / ')??(typeof a?.value==='boolean'?(a.value?'Đúng':'Sai'):'');};
function storedDraft(){try{return JSON.parse(sessionStorage.getItem(localKey)||'null');}catch{return null;}}
function changed(){
 if(busy||!state.question)return;const answer=collect();generation++;sessionStorage.setItem(localKey,JSON.stringify({questionId:state.question.id,revision:state.revision,answer}));
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>queueSave(),700);
}
function queueSave(){
 const qid=state.question?.id,answer=collect(),g=generation;
 saveChain=saveChain.catch(()=>{}).then(async()=>{if(!qid||state.question?.id!==qid||busy)return;
  const status=document.getElementById('session-save-status');if(status)status.textContent='Đang lưu…';
  try{const r=await request('/runs/'+id+'/draft',{method:'PUT',body:{revision:state.revision,answer}});state.revision=r.revision;if(status)status.textContent='Đã lưu vào tài khoản';if(g===generation)sessionStorage.removeItem(localKey);else sessionStorage.setItem(localKey,JSON.stringify({questionId:qid,revision:state.revision,answer:collect()}));}
  catch(e){if(status)status.textContent=e.status===409?'Bài đã thay đổi ở thiết bị khác. Hãy tải lại.':'Chờ kết nối · Bản nháp được giữ trong thẻ trình duyệt này.';if(e.status===409)message(e.message,true);}
 });return saveChain;
}
function questionForm(q){
 const form=el('form',{class:'experience-choices'}),local=storedDraft(),draft=local?.questionId===q.id&&local.revision===state.revision?local.answer:state.draft||{};
 if(['single_choice','multiple_choice'].includes(q.type)){
  const inputs=q.options.map(o=>{const input=el('input',{type:q.type==='single_choice'?'radio':'checkbox',name:'answer',value:o.key});input.checked=q.type==='single_choice'?draft.key===o.key:(draft.keys||[]).includes(o.key);form.append(el('label',{class:'experience-choice'},[input,el('span',{text:o.text})]));return input;});
  collect=()=>q.type==='single_choice'?{key:inputs.find(i=>i.checked)?.value||''}:{keys:inputs.filter(i=>i.checked).map(i=>i.value)};
 }else if(q.type==='true_false'){
  const inputs=[true,false].map(v=>{const input=el('input',{type:'radio',name:'answer',value:String(v)});input.checked=draft.value===v;form.append(el('label',{class:'experience-choice'},[input,el('span',{text:v?'Đúng':'Sai'})]));return input;});collect=()=>{const i=inputs.find(x=>x.checked);return i?{value:i.value==='true'}:{};};
 }else{const input=el('input',{class:'input',name:'answer',maxlength:200,'aria-label':'Câu trả lời'});input.value=draft.value||'';form.append(input);collect=()=>({value:input.value});}
 form.onsubmit=e=>e.preventDefault();form.addEventListener('input',changed);return form;
}
function render(){
 root.replaceChildren();message('');const header=el('div',{class:'experience-actions'},[el('span',{class:'experience-pill',text:state.title}),el('span',{text:state.answered+'/'+state.total+' câu đã chốt'}),link('Về trang chủ','/pages/student/home/')]);root.append(header);
 if(state.status==='finished'){
  sessionStorage.removeItem(localKey);
  root.append(card('Bạn đã hoàn thành buổi học',el('strong',{class:'experience-question',text:state.correct+'/'+state.total+' câu đúng · '+state.percent+'/100'}),el('p',{text:state.percent>=80?'Bạn đang làm tốt. Hãy thử một bài tương tự trong buổi tiếp theo.':'Mình xem lại những câu chưa đúng, rồi luyện một lượt sửa lỗi nhé.'}),el('div',{class:'experience-actions'},[link('Xem tiến bộ','/pages/student/progress/',true),link('Nhiệm vụ & thành tích','/pages/student/personal/'),action('Luyện một lượt sửa lỗi',async()=>{const r=await request('/runs',{method:'POST',body:{kind:'review'}});location.assign(r.href);})])));
  for(const f of state.feedback)root.append(el('div',{class:'experience-feedback'+(f.correct?'':' is-wrong')},[el('strong',{text:f.prompt}),el('p',{text:(f.correct?'Đúng':'Cần ôn lại')+' · '+f.explanation}),el('details',{},[el('summary',{text:'Xem đáp án'}),el('p',{text:String(expected(f))})])]));return;
 }
 if(!state.question){root.append(card('Cùng chốt buổi học',el('p',{text:'Bạn đã trả lời đủ câu. Hoàn thành để lưu kết quả và cập nhật tiến bộ.'}),action('Hoàn thành buổi học',async()=>{state=await request('/runs/'+id+'/finish',{method:'POST'});render();},true)));return;}
 const q=state.question,form=questionForm(q),hint=el('p',{class:'experience-status',role:'status'}),saveStatus=el('p',{id:'session-save-status',class:'experience-status',role:'status',text:'Bài được lưu theo tài khoản. Bản nháp được giữ khi tải lại cùng thẻ.'}),prompt=q.subject==='chinese'?chineseQuestionPrompt(q.prompt):q.prompt;
 const submit=action('Chốt câu trả lời',async()=>{if(busy)return;clearTimeout(saveTimer);await queueSave();await saveChain;const answer=collect();busy=true;
  try{state=await request('/runs/'+id+'/answer',{method:'POST',body:{questionId:q.id,answer,revision:state.revision}});sessionStorage.removeItem(localKey);render();}finally{busy=false;}
 },true);
 root.append(card(q.label,el('p',{class:'experience-question',text:prompt}),questionAudio(prompt,{language:q.subject==='tieng-anh'?'en-US':q.subject==='chinese'?'zh-CN':'vi-VN'}),form,saveStatus,el('div',{class:'experience-actions'},[submit,...(q.subject==='chinese'?[]:[1,2]).map(level=>action('Gợi ý '+level,async()=>{const r=await request('/runs/'+id+'/hint?level='+level);hint.textContent=r.text;}))]),hint));
 const previous=state.feedback.at(-1);if(previous)root.append(el('div',{class:'experience-feedback'+(previous.correct?'':' is-wrong')},[el('strong',{text:previous.correct?'Câu trước đã đúng':'Câu trước cần ôn lại'}),el('p',{text:previous.prompt}),el('p',{text:previous.explanation||'Hãy xem đáp án và tự giải thích lại cách làm.'}),el('p',{text:'Đáp án: '+expected(previous)})]));
}
window.addEventListener('online',()=>{if(state?.question)queueSave();});window.addEventListener('pagehide',()=>clearTimeout(saveTimer));
async function main(){profile=await boot('today');if(!id)throw new Error('Bạn hãy mở một buổi học từ trang chủ.');localKey='ttnava-draft:'+profile.id+':'+id;state=await request('/runs/'+id);render();}
main().catch(e=>message(e.message,true));
