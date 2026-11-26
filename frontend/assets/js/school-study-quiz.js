import {api,el} from './api.js';
import {questionAudio} from './question-audio.js';
import {prepareAnswerSound,playAnswerSound} from './answer-sound.js';
export function schoolQuizPlayer(quiz,{onExit,onComplete,onNext}={}){
 let state=quiz.state,busy=false,feedback=null;const root=el('section',{class:'school-quiz-player','aria-label':'Quiz 20 câu'}),message=el('p',{class:'school-quiz-status',role:'status','aria-live':'polite'});
 const action=(text,fn,primary=false)=>el('button',{type:'button',class:'btn '+(primary?'btn-primary':'btn-ghost'),text,onclick:async event=>{if(busy)return;const button=event.currentTarget;busy=true;button.disabled=true;message.textContent='';try{await fn();}catch(error){message.textContent=error.message;button.disabled=false;}finally{busy=false;}}});
 const expected=question=>question.type==='single_choice'?question.options.find(option=>option.key===question.expected.key)?.text||question.expected.key:question.type==='multiple_choice'?question.options.filter(option=>question.expected.keys.includes(option.key)).map(option=>option.text).join(' · '):question.expected.accepted?.join(' / ')||(question.expected.value?'Đúng':'Sai');
 function choices(question){
  const form=el('fieldset',{class:'school-quiz-choices'},[el('legend',{class:'sr-only',text:'Chọn câu trả lời'})]);let collect;
  if(['single_choice','multiple_choice'].includes(question.type)){
   const inputs=question.options.map(option=>{const input=el('input',{type:question.type==='single_choice'?'radio':'checkbox',name:'school-answer-'+state.id+'-'+question.id,value:option.key});form.append(el('label',{class:'school-quiz-choice'},[input,el('span',{text:option.text})]));return input;});
   collect=()=>question.type==='single_choice'?{key:inputs.find(input=>input.checked)?.value||''}:{keys:inputs.filter(input=>input.checked).map(input=>input.value)};
  }else if(question.type==='true_false'){
   const inputs=[true,false].map(value=>{const input=el('input',{type:'radio',name:'school-answer-'+state.id+'-'+question.id,value:String(value)});form.append(el('label',{class:'school-quiz-choice'},[input,el('span',{text:value?'Đúng':'Sai'})]));return input;});collect=()=>{const value=inputs.find(input=>input.checked);return value?{value:value.value==='true'}:{};};
  }else{const input=el('input',{class:'input',type:'text',maxlength:200,'aria-label':'Câu trả lời'});form.append(input);collect=()=>({value:input.value});}
  return {form,collect};
 }
 async function finish(){state=(await api('/api/v1/experience/runs/'+state.id+'/finish',{method:'POST'})).data;onComplete?.(state);}
 function draw(){
  root.replaceChildren();const heading=el('header',{class:'school-quiz-heading'},[el('div',{},[el('span',{class:'school-quiz-caption',text:'QUIZ THEO BÀI · CHẶNG '+quiz.stage}),el('h3',{text:state.status==='finished'?'Đã hoàn thành':'Câu '+Math.min(20,state.answered+(feedback?0:1))+' / 20'})]),action('Về bài học',()=>onExit?.())]);
  const progress=el('div',{class:'school-quiz-dots','aria-label':'Đã chốt '+state.answered+' trên 20 câu'});for(let index=0;index<20;index++)progress.append(el('span',{class:(index<state.answered?'is-done':'')+(index===state.answered?' is-current':''),'aria-hidden':'true'}));root.append(heading,progress,message);
  if(feedback){
   root.append(el('div',{class:'school-quiz-feedback '+(feedback.correct?'is-correct':'is-wrong')},[el('strong',{text:feedback.correct?'Chính xác!':'Mình xem lại cách làm nhé'}),el('p',{text:feedback.prompt}),el('p',{text:'Đáp án: '+expected(feedback)}),el('p',{text:feedback.explanation})]),action(state.status==='finished'?'Xem kết quả':'Câu tiếp theo',()=>{feedback=null;draw();},true));return;
  }
  if(state.status==='finished'){
   root.append(el('div',{class:'school-quiz-result'},[el('img',{src:'/assets/images/mascot-panda.svg',width:90,height:96,alt:''}),el('strong',{text:state.correct+'/20 câu đúng'}),el('p',{text:state.percent+'/100 điểm · Kết quả và tiến độ đã được lưu.'})]),el('div',{class:'school-quiz-actions'},[action('Về bài học',()=>onExit?.(),true),...(onNext?[action('Chặng tiếp theo',()=>onNext())]:[])]));
   const wrong=state.feedback.filter(item=>!item.correct);if(wrong.length)root.append(el('details',{class:'school-quiz-review'},[el('summary',{text:'Xem lại '+wrong.length+' câu cần ôn'}),...wrong.map(item=>el('article',{},[el('p',{text:item.prompt}),el('strong',{text:expected(item)}),el('p',{text:item.explanation})]))]));return;
  }
  if(!state.question){root.append(action('Hoàn thành và lưu kết quả',async()=>{await finish();draw();},true));return;}
  const question=state.question,{form,collect}=choices(question);
  root.append(el('p',{class:'school-quiz-prompt',text:question.prompt}),...(question.imageUrl?[el('img',{class:'school-quiz-image',src:question.imageUrl,alt:'Hình minh họa câu hỏi'})]:[]),questionAudio(question.prompt,{language:question.subject==='tieng-anh'?'en-US':'vi-VN'}),form,action('Chốt đáp án',async()=>{
   prepareAnswerSound();
   state=(await api('/api/v1/experience/runs/'+state.id+'/answer',{method:'POST',body:{questionId:question.id,answer:collect(),revision:state.revision}})).data;
   feedback=state.feedback.find(item=>item.id===question.id);if(feedback)playAnswerSound(Boolean(feedback.correct));if(state.answered===20)await finish();draw();
  },true),el('p',{class:'school-quiz-save-hint',text:'Đã lưu '+state.answered+'/20 câu đã chốt. Bạn có thể quay lại bài đang làm.'}));
 }
 draw();return root;
}
