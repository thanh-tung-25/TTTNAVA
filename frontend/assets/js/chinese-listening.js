import {el} from './chinese-common.js';
import {questionAudio,withChoiceAudio,stopQuestionAudio} from './question-audio.js';
import {uniqueStudyWords,shuffleStudy} from './chinese-study-variety.js';

export function listeningStages(words,size=10){
 const unique=uniqueStudyWords(words).filter(i=>i.data.hanzi&&i.data.meaning);
 return Array.from({length:Math.ceil(unique.length/size)},(_,n)=>unique.slice(n*size,(n+1)*size));
}
const button=(text,action,primary=false)=>el('button',{type:'button',class:'btn '+(primary?'btn-primary':'btn-secondary'),text,onclick:action});
export function listeningPractice(host,words,setId){
 const stages=listeningStages(words),all=stages.flat(),sessions=new Map(),app=el('section',{class:'listening-app'});let selected=0;
 host.append(app);
 const hero=()=>el('header',{class:'listening-hero'},[el('div',{},[el('span',{class:'chinese-hero-eyebrow',text:'NGHE TỪNG CHÚT, NHỚ THẬT LÂU'}),el('h2',{text:'Luyện nghe từ trong bài'}),el('p',{text:all.length+' từ · '+stages.length+' chặng · tối đa 10 từ mỗi chặng.'})]),el('img',{src:'/assets/images/mascot-bunny.svg',width:100,height:110,alt:'Thỏ ngọc cùng bạn luyện nghe'})]);
 function showStages(){
  stopQuestionAudio();app.replaceChildren(hero());
  if(all.length<2){app.append(el('p',{class:'listening-note',text:'Cần ít nhất 2 từ có nghĩa khác nhau để luyện nghe.'}));return;}
  const map=el('nav',{class:'listening-stage-map','aria-label':'Các chặng luyện nghe'});
  for(const [n,stage]of stages.entries()){
   const state=sessions.get(n),done=state?.index===stage.length;
   const tile=el('button',{type:'button',class:'listening-stage'+(done?' is-complete':''),'aria-label':'Chặng '+(n+1)+' · '+stage.length+' từ','aria-pressed':String(n===selected),onclick:()=>{selected=n;showStages();}},[
    el('span',{class:'listening-stage-orb','aria-hidden':'true',text:done?'✓':String(n+1)}),el('strong',{text:'Chặng '+(n+1)}),el('small',{text:done?state.score+'/'+stage.length+' câu đúng':stage.length+' từ'+(state?' · đang luyện':'')}),
   ]);map.append(tile);
  }
  const state=sessions.get(selected),done=state?.index===stages[selected].length;
  app.append(el('div',{class:'listening-start'},[el('p',{text:'Chặng '+(selected+1)+' · '+stages[selected].length+' từ'}),button((done?'Luyện lại':state?'Tiếp tục':'Bắt đầu')+' chặng '+(selected+1),()=>start(),true)]),map,el('p',{class:'listening-note',text:'Chỉ phát âm thanh khi bạn bấm nghe. Đây là phần tự luyện, không tính Kim Cương.'}));
 }
 function start(restart=false){
  let state=sessions.get(selected);
  if(restart||!state||state.index===state.deck.length){state={deck:[...stages[selected]],index:0,score:0,answer:null};sessions.set(selected,state);}
  showQuestion();
 }
 function showQuestion(){
  stopQuestionAudio();const state=sessions.get(selected);
  if(state.index===state.deck.length){showResult();return;}
  const item=state.deck[state.index],status=el('p',{role:'status','aria-live':'polite'}),choices=el('div',{class:'hub-listen-options'}),seen=new Set([item.data.meaning]);
  const distractors=shuffleStudy(all.filter(i=>i.id!==item.id&&i.data.meaning!==item.data.meaning)).filter(i=>{if(seen.has(i.data.meaning))return false;seen.add(i.data.meaning);return true;}).slice(0,3),options=shuffleStudy([item,...distractors]);
  const next=button('Câu tiếp theo',()=>{state.index++;state.answer=null;showQuestion();},true);next.hidden=state.answer===null;
  const feedback=()=>{status.textContent=(state.answer===item.id?'Đúng rồi! ':'Chưa đúng. ')+item.data.hanzi+' · '+(item.data.pinyin||'')+' · '+item.data.meaning;};
  for(const [n,option]of options.entries()){
   const answer=button(option.data.meaning,()=>{
    if(state.answer!==null)return;
    state.answer=option.id;if(option.id===item.id)state.score++;stopQuestionAudio();
    for(const b of choices.querySelectorAll('.listening-answer'))b.disabled=true;
    feedback();next.hidden=false;
   });answer.classList.add('listening-answer');answer.disabled=state.answer!==null;choices.append(withChoiceAudio(answer,option.data.meaning,n+1));
  }
  if(state.answer!==null)feedback();
  const bar=el('header',{class:'listening-round-bar'},[button('← Chọn chặng',showStages),el('span',{text:'Chặng '+(selected+1)+' / '+stages.length})]);
  app.replaceChildren(bar,el('section',{class:'hub-card listening-question'},[el('h3',{class:'quiz-prompt',text:'Nghe và chọn nghĩa · '+(state.index+1)+'/'+state.deck.length}),questionAudio(item.data.hanzi,{label:'Nghe từ tiếng Trung'}),choices,status,next]));
 }
 function showResult(){
  const state=sessions.get(selected);
  app.replaceChildren(el('section',{class:'hub-card listening-result'},[el('img',{src:'/assets/images/mascot-panda.svg',width:100,height:110,alt:''}),el('h3',{text:'Hoàn thành chặng '+(selected+1)+'!'}),el('p',{text:state.score+'/'+state.deck.length+' câu đúng'}),el('div',{class:'listening-result-actions'},[button('Về các chặng',showStages),button('Luyện lại chặng này',()=>start(true),true),...(selected<stages.length-1?[button('Chặng tiếp theo',()=>{selected++;showStages();})]:[])])]));
 }
 showStages();
 return ()=>stopQuestionAudio();
}
