import {el,link,field,request} from './chinese-common.js';
import {api} from './api.js';
import {createChatAudio} from './chinese-ai-chat-audio.js';
import {chatScenarios} from './chinese-ai-chat-data.js';
const p=(text,className='')=>el('p',{class:className,text});
const button=(text,action,primary=false)=>el('button',{type:'button',class:'btn '+(primary?'btn-primary':'btn-secondary'),text,onclick:action});
export async function renderChineseAiChat(host,{role='student',level=1}={}){
 if(!document.querySelector('link[data-ai-chat-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/chinese-ai-chat.css','data-ai-chat-style':''}));
 const admin=role==='admin',params=new URLSearchParams(location.search),app=el('div',{class:'ai-voice-app'}),main=el('div'),notice=p('','voice-notice');
 notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 app.append(main,notice,el('footer',{class:'voice-footer'},[link('← Về bài học',{level},role)]));host.append(app);
 let meta,selected,session=null,reply=null,pending=null,inflight=false,active=false,disposed=false,phase='setup',message='',timer,controller,textMode=false,starting=false,needsTextVoice=false,conversationEpoch=0;
 const audio=createChatAudio({onState:(state,seconds)=>{if(!session||disposed)return;if(state==='preparing')setPhase('processing','Mình đang nghe câu bạn vừa nói…');else if(active)setPhase('listening',seconds?'Bạn đang nói · '+seconds+'/20 giây':'Đến lượt bạn. Cứ nói tự nhiên nhé.');},onTurn:blob=>{if(!active||disposed||!session)return;pending={id:crypto.randomUUID(),turn:session.turn_count+1,blob,state:session.state};sendPending();},onError:error=>pause(error.message),onIdle:reason=>pause(reason)});
 const tell=error=>{notice.textContent=error.message||String(error);};
 const header=()=>el('header',{class:'voice-hero'},[el('div',{},[el('span',{class:'voice-eyebrow',text:admin?'THIẾT KẾ CHỦ ĐỀ TRÒ CHUYỆN':'NGHE · NÓI · CÙNG NHAU TIẾP CHUYỆN'}),el('h2',{text:'Nói chuyện với Sư tử AI'}),p(admin?'Soạn chủ đề rồi thử nói chuyện như học sinh.':'Một người bạn cùng bạn nói tiếng Trung mỗi ngày.')]),el('img',{src:'/assets/images/mascot-lion.svg',alt:'Sư tử AI',width:95,height:106})]);
 const names={setup:'Sẵn sàng trò chuyện',connecting:'Đang kết nối',listening:'Đang nghe bạn',processing:'AI đang suy nghĩ',speaking:'AI đang nói',paused:'Đã tạm dừng',ended:'Hẹn bạn lần sau'};
 function setPhase(next,description=''){phase=next;message=description;app.dataset.phase=next;const status=main.querySelector('[data-voice-status]'),hint=main.querySelector('[data-voice-hint]');if(status&&status.textContent!==names[next])status.textContent=names[next];if(hint)hint.textContent=description;updateControls();}
 function updateControls(){
  const pauseButton=main.querySelector('[data-pause]');if(pauseButton){pauseButton.textContent=active?'Ⅱ Tạm dừng':pending?'▶ Thử lại':textMode?'● Bật micro':'▶ Tiếp tục';pauseButton.disabled=starting||!session;}
  const done=main.querySelector('[data-done]');if(done)done.disabled=phase!=='listening';
  main.querySelectorAll('[data-replay]').forEach(b=>{b.disabled=inflight;});
  const input=main.querySelector('[data-text]'),send=main.querySelector('[data-text-send]');if(input)input.disabled=inflight;if(send)send.disabled=inflight||!input?.value.trim();
  const remaining=main.querySelector('[data-voice-time]');if(remaining&&session){const secs=Math.max(0,Math.ceil((new Date(session.expires_at)-Date.now())/1000));remaining.textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');}
 }
 async function refresh(){meta=await request('/ai-chat?level='+level);selected=meta.lessons.find(l=>l.id===(selected?.id||params.get('lesson')))||meta.lessons[0];}
 function renderSetup(){
  clearInterval(timer);main.replaceChildren(header());
  if(!selected){main.append(p('Cấp này chưa có chủ đề trò chuyện. Bạn quay lại bài học nhé.'));return;}
  const card=el('section',{class:'voice-setup-card'}),choice=field('Bạn muốn nói chuyện về bài nào?','lesson',selected.id,'text',meta.lessons.map(l=>[l.id,l.title]));
  choice.querySelector('select').onchange=e=>{selected=meta.lessons.find(l=>l.id===e.target.value);params.set('lesson',selected.id);history.replaceState(null,'','?'+params);notice.textContent='';renderSetup();};
  const topic=chatScenarios.find(s=>s.id===selected.settings.scenario_id);
  card.append(choice,el('div',{class:'voice-topic'},[el('span',{text:topic.icon,'aria-hidden':'true'}),el('div',{},[el('h3',{text:topic.title}),p(selected.settings.goal)])]),p('Bấm bắt đầu một lần. Bạn nói xong, Sư tử sẽ tự trả lời.','voice-intro'));
  const start=button('● Bắt đầu trò chuyện',()=>startConversation(true),true);start.dataset.start='';
  const reusable=meta.active?.lesson_id===selected.id&&meta.active.turn_count<meta.limits.turns;
  start.disabled=!meta.configured||(!admin&&!selected.settings.enabled)||(!meta.remaining&&!reusable);
  const keyboard=button('Dùng bàn phím thay micro',()=>startConversation(false));keyboard.disabled=start.disabled;
  card.append(start,keyboard,p('Tối đa 5 phút/buổi · '+meta.remaining+'/'+meta.limits.daily+' buổi mới còn lại hôm nay.','voice-small'),p('Không lưu lịch sử hội thoại. Không chấm điểm hoặc gửi giáo viên.','voice-privacy'));
  if(!meta.configured)card.append(p(meta.reason,'voice-unavailable'));
  if(!admin&&!selected.settings.enabled)card.append(p('Chủ đề này đang được chuẩn bị. Bạn chọn bài khác nhé.','voice-unavailable'));
  main.append(card);if(admin)renderTeacher(card);
 }
 function renderTeacher(card){
  const details=el('details',{class:'voice-teacher'},[el('summary',{text:'✎ Sửa chủ đề trò chuyện'})]),form=el('form'),s=selected.settings,enabled=el('input',{type:'checkbox',name:'enabled'});enabled.checked=s.enabled;
  form.append(el('label',{class:'voice-enable'},[enabled,'Mở chủ đề này cho học sinh']));
  const scenario=field('Tình huống','scenario_id',s.scenario_id,'text',chatScenarios.map(t=>[t.id,t.icon+' '+t.title]));
  form.append(scenario,field('Mục tiêu và bối cảnh','goal',s.goal,'textarea'),field('Câu mở đầu tiếng Trung','opening',s.opening,'textarea'),field('Nghĩa câu mở đầu (chỉ hiện khi mở dịch)','translation',s.translation,'textarea'),field('Từ gợi ý cho AI (cách nhau bằng dấu phẩy)','required_words',s.required_words.join(', '),'textarea'));
  for(const [name,max]of [['goal',350],['opening',200],['translation',300],['required_words',800]])form.elements[name].maxLength=max;
  scenario.querySelector('select').onchange=e=>{const item=chatScenarios.find(t=>t.id===e.target.value);for(const k of ['goal','opening','translation'])form.elements[k].value=item[k];};
  const save=el('button',{type:'submit',class:'btn btn-primary',text:'Lưu chủ đề'});form.append(save,p('Học sinh được hỏi và kể chuyện tự nhiên theo chủ đề. Buổi trò chuyện không tạo báo cáo cho cô.','voice-small'));
  form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{const d=Object.fromEntries(new FormData(form));await request('/ai-chat/lessons/'+selected.id,'PUT',{...d,enabled:enabled.checked,required_words:d.required_words.split(/[,，\n]/).map(t=>t.trim()).filter(Boolean),max_turns:s.max_turns});await refresh();renderSetup();notice.textContent='Đã lưu chủ đề.';}catch(e){tell(e);}finally{save.disabled=false;}};
  details.append(form);card.append(details);
 }
 async function startConversation(useMic){
  if(starting||disposed)return;starting=true;notice.textContent='';textMode=!useMic;needsTextVoice=false;setPhase('connecting');
  main.querySelectorAll('button,select').forEach(b=>b.disabled=true);
  try{
   if(useMic&&!await audio.open())throw Error('Chưa mở được micro. Bạn thử lại khi trang đang mở nhé.');
   const next=await request('/ai-chat/sessions','POST',{lesson_id:selected.id,request_id:crypto.randomUUID()});if(disposed){audio.pause();return;}
   conversationEpoch++;session=next;reply=next.reply;pending=null;active=useMic&&!document.hidden;starting=false;renderCall();timer=setInterval(()=>{updateControls();if(session&&Date.now()>=new Date(session.expires_at).getTime())endConversation('Buổi trò chuyện đã hết thời gian. Hẹn bạn lần sau nhé!');},1000);
   if(next.status!=='active'){endConversation();return;}
   if(active)await speakAndListen();else setPhase('paused',useMic?'Micro đã tắt khi bạn rời màn hình. Bấm Tiếp tục để mở lại.':'Bạn nhập chữ bên dưới, hoặc bấm Bật micro để nói chuyện.');
  }catch(e){active=false;audio.pause();starting=false;setPhase('setup');renderSetup();tell(e);}finally{starting=false;}
 }
 function renderCall(){
  main.replaceChildren(header());const call=el('section',{class:'voice-call'});
  const end=button('Kết thúc',()=>endConversation());end.dataset.end='';
  call.append(el('div',{class:'voice-call-top'},[el('div',{},[el('span',{text:selected.title}),el('time',{'data-voice-time':'',text:'05:00','aria-label':'Thời gian còn lại'})])]));
  call.append(el('div',{class:'voice-orb','aria-hidden':'true'},[el('span',{class:'voice-orbit'}),el('img',{src:'/assets/images/mascot-lion.svg',width:132,height:145,alt:''})]),el('h3',{'data-voice-status':'',text:names[phase],role:'status','aria-live':'polite'}),el('p',{'data-voice-hint':'',class:'voice-hint',text:message}),el('div',{class:'voice-bars','aria-hidden':'true'},Array.from({length:5},()=>el('i'))));
  const controls=el('div',{class:'voice-controls','aria-label':'Điều khiển cuộc trò chuyện'},[button('Ⅱ Tạm dừng',()=>active?pause():resume(),true),button('✓ Nói xong',()=>audio.finishTurn()),end]);
  controls.children[0].dataset.pause='';controls.children[1].dataset.done='';call.firstElementChild.after(controls);
  const captions=el('details',{class:'voice-captions'},[el('summary',{text:'Hiện chữ khi cần'}),el('p',{'data-caption':'',lang:'zh-CN',text:reply?.reply_zh||''}),el('details',{},[el('summary',{text:'Dịch nghĩa'}),p(reply?.translation_vi||'')])]);
  const replay=button('▶ Nghe lại',()=>replayReply(false)),slow=button('▷ Nghe chậm',()=>replayReply(true));replay.dataset.replay='';slow.dataset.replay='';captions.open=textMode;captions.append(el('div',{class:'voice-replay'},[replay,slow]));call.append(captions);
  const typing=el('details',{class:'voice-typing'},[el('summary',{text:'Nhập chữ thay micro'})]);typing.open=textMode;
  const form=el('form',{autocomplete:'off'}),input=el('textarea',{'data-text':'',rows:2,maxlength:400,placeholder:'Gõ tiếng Trung để tiếp tục…','aria-label':'Câu nói tiếng Trung',lang:'zh-CN',autocomplete:'off'}),send=el('button',{type:'submit',class:'btn btn-secondary','data-text-send':'',text:'Gửi câu nói'});input.oninput=updateControls;
  form.append(input,send);form.onsubmit=e=>{e.preventDefault();if(inflight||!input.value.trim()||!session)return;pause();textMode=true;captions.open=true;pending={id:crypto.randomUUID(),turn:session.turn_count+1,text:input.value.trim(),state:session.state};input.value='';sendPending();};typing.append(form);call.append(typing,p('Micro tắt khi tạm dừng hoặc chuyển tab. Bạn có thể ngừng nói khoảng 1–2 giây để chuyển lượt.','voice-small'),p('Nội dung chỉ nhớ tạm trong buổi này; kết thúc là xóa khỏi trang.','voice-privacy'));main.append(call);updateControls();call.scrollIntoView({block:'start'});
 }
 function updateReply(){const caption=main.querySelector('[data-caption]');if(caption){caption.textContent=reply?.reply_zh||'';const translation=main.querySelector('.voice-captions details p');if(translation)translation.textContent=reply?.translation_vi||'';}}
 async function speakAndListen(){
  if(!active||!session||disposed)return;setPhase('speaking','Sư tử đang trả lời. Đợi một chút nhé.');
  const ok=await audio.say(reply.reply_zh);
  if(!active||!session||disposed)return;
  if(!ok){needsTextVoice=true;pause('Máy chưa phát được giọng Trung. Bạn mở Hiện chữ để đọc, rồi bấm Tiếp tục hoặc dùng bàn phím nhé.');return;}needsTextVoice=false;
  await new Promise(resolve=>setTimeout(resolve,250));
  if(active&&session&&!disposed){setPhase('listening','Đến lượt bạn. Cứ nói tự nhiên nhé.');audio.listen();}
 }
 function pause(reason='Micro đã tắt. Bạn tiếp tục khi sẵn sàng nhé.'){active=false;audio.pause();if(session)setPhase('paused',reason);}
 async function resume(){
  if(!session||starting||disposed)return;notice.textContent='';starting=true;updateControls();
  try{
   if(pending&&textMode){starting=false;await sendPending();return;}
   if(!await audio.open()||!session||disposed)return;
   starting=false;updateControls();
   active=true;textMode=false;
   if(inflight){setPhase('processing','AI đang trả lời câu vừa rồi…');return;}
   if(pending)await sendPending();else if(needsTextVoice){setPhase('listening','Bạn đã đọc lời đáp. Đến lượt bạn nói nhé.');audio.listen();}else await speakAndListen();
  }catch(e){pause(e.message);}finally{starting=false;updateControls();}
 }
 async function replayReply(slow){if(!reply||!session)return;pause();setPhase('speaking','Nghe lại lời Sư tử…');await audio.say(reply.reply_zh,{slow});if(session&&!active)setPhase('paused','Bạn bấm Tiếp tục khi muốn nói tiếp nhé.');}
 async function sendPending(){
  if(!session||!pending||inflight||disposed)return;inflight=true;setPhase('processing','Mình đang nghe và chuẩn bị trả lời…');const current=session.id,epoch=conversationEpoch,turn=pending,aborter=new AbortController();controller=aborter;
  try{
   const body=turn.blob?new FormData():{text:turn.text,state:turn.state};if(turn.blob){body.append('state',turn.state);body.append('audio',turn.blob,'turn.wav');}
   const data=(await api('/api/v1/chinese/ai-chat/sessions/'+current+'/turns/'+turn.turn+'/'+turn.id+'/'+(turn.blob?'audio':'text'),{method:'POST',body,signal:aborter.signal})).data;
   if(!session||session.id!==current||epoch!==conversationEpoch||disposed)return;session=data;reply=data.reply;pending=null;updateReply();inflight=false;
   if(data.status!=='active'){if(active)await audio.say(reply.reply_zh);endConversation();return;}
   if(active)await speakAndListen();else setPhase('paused','AI đã trả lời. Bạn bấm Tiếp tục hoặc nhập chữ để trò chuyện tiếp.');
  }catch(e){
   if(e.name==='AbortError'||!session||epoch!==conversationEpoch||disposed)return;
   if(['CHAT_STATE_INVALID','CHAT_STALE_TURN','CHAT_FINISHED','CHAT_EXPIRED'].includes(e.code)){endConversation(e.message);return;}
   if(['CHAT_NO_SPEECH','CHAT_AUDIO_LIMIT','VALIDATION_ERROR'].includes(e.code))pending=null;
   pause(e.message);
  }finally{if(controller===aborter){inflight=false;controller=null;updateControls();}}
 }
 async function endConversation(reason='Cuộc trò chuyện đã kết thúc. Hẹn bạn lần sau nhé!'){
  if(!session)return;const id=session.id;conversationEpoch++;active=false;audio.pause();controller?.abort();controller=null;pending=null;session=null;reply=null;inflight=false;clearInterval(timer);notice.textContent='';setPhase('ended');
  main.replaceChildren(header(),el('section',{class:'voice-ended'},[el('img',{src:'/assets/images/mascot-lion.svg',width:100,height:112,alt:''}),el('h3',{text:'Hẹn bạn lần sau!'}),p(reason),p('Nội dung buổi trò chuyện đã được xóa khỏi trang.','voice-privacy'),button('Về chọn chủ đề',async()=>{try{await refresh();renderSetup();setPhase('setup');}catch(e){tell(e);}},true)]));
  try{await request('/ai-chat/sessions/'+id+'/finish','POST',{});}catch{}
 }
 const hidden=()=>{if(document.hidden&&(session||starting))pause('Micro đã tắt khi bạn rời màn hình. Bấm Tiếp tục để mở lại.');};document.addEventListener('visibilitychange',hidden);
 function dispose(){
  disposed=true;active=false;clearInterval(timer);audio.dispose();controller?.abort();pending=null;reply=null;
  if(session){const id=session.id;session=null;fetch('/api/v1/chinese/ai-chat/sessions/'+id+'/finish',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json','X-Course-Id':'hsk-'+level},body:'{}'}).catch(()=>{});}
  main.replaceChildren();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',dispose);
 }
 window.addEventListener('pagehide',dispose);window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 main.append(header(),p('Đang mở góc trò chuyện…'));
 try{await refresh();if(!disposed)renderSetup();}catch(e){tell(e);main.append(button('Thử tải lại',()=>location.reload()));}
 return dispose;
}
