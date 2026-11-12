import {el,link,field,request} from './chinese-common.js';
import {createChatAudio} from './chinese-ai-chat-audio.js';
import {chatScenarios} from './chinese-ai-chat-data.js';
// All conversation styles are scoped to this feature.
if(!document.querySelector('link[data-ai-chat-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/chinese-ai-chat.css','data-ai-chat-style':''}));
const btn=(text,fn,primary=false)=>el('button',{type:'button',class:'btn '+(primary?'btn-primary':'btn-secondary'),text,onclick:fn});
const paragraph=(text,className='')=>el('p',{class:className,text});
function summaryCard(summary,{preview=false,report=false,turns=0}={}){
 const box=el('section',{class:'ai-chat-summary'},[el('span',{class:'ai-chat-tag',text:'BUỔI LUYỆN CỦA BẠN'}),el('h3',{text:turns?'Mỗi câu nói là một bước tiến':'Hẹn bạn ở buổi luyện tiếp theo'}),paragraph(summary?.feedback||'Buổi này chưa có câu trả lời để nhận xét.')]);
 if(summary?.strengths?.length)box.append(el('h4',{text:'Bạn đã làm tốt'}),el('ul',{},summary.strengths.map(s=>el('li',{text:s}))));
 if(summary?.errors?.length){box.append(el('h4',{text:'Cùng sửa một chút'}));for(const error of summary.errors)box.append(el('div',{class:'ai-chat-correction'},[paragraph(error.original,'ai-chat-original'),paragraph('→ '+error.suggestion,'ai-chat-corrected'),paragraph(error.explanation)]));}
 if(summary?.practice_words?.length)box.append(el('h4',{text:'Từ nên ôn lại'}),el('div',{class:'ai-chat-chips'},summary.practice_words.map(w=>el('span',{text:w,lang:'zh-CN'}))));
 box.append(paragraph(report?'Nhận xét từ nội dung chữ; cô xem xét lại khi cần. Không có bản ghi âm trong báo cáo.':preview?'Đây là buổi thử của admin, không đưa vào kết quả học sinh.':turns?'Đã gửi tổng kết cho cô. Nhận xét dựa trên chữ nhận diện; cô sẽ xem xét lại khi cần.':'Chưa gửi nhận xét cho cô vì chưa có câu trả lời.','ai-chat-footnote'));return box;
}
export async function renderChineseAiChat(host,{role='student',level=1}={}){
 const admin=role==='admin';let meta,selected,session,busy=false,audioState='idle',draft,draftUrl,pending,startId=crypto.randomUUID(),disposed=false;
 const params=new URLSearchParams(location.search),panel=el('div',{class:'ai-chat-app'}),alert=paragraph('','ai-chat-alert');alert.setAttribute('role','status');alert.setAttribute('aria-live','polite');
 const content=el('div'),footer=el('div',{class:'ai-chat-footer'},[link('← Về bài học',{level},role)]);host.append(panel);panel.append(content,alert,footer);
 const showError=e=>{alert.textContent=e.message;};
 const media=createChatAudio({onError:showError,onVoices:voices=>{panel.dataset.voice=voices.length?'ready':'missing';},onState:(state,seconds)=>{audioState=state;const rec=panel.querySelector('[data-record]');if(rec)rec.textContent=state==='recording'?`■ Dừng ghi · ${seconds}/20 giây`:state==='permission'?'Đang mở micro…':state==='preparing'?'Đang chuẩn bị…':'● Ghi âm trả lời';updateDisabled();},onDraft:blob=>{clearDraft();draft=blob;draftUrl=URL.createObjectURL(blob);renderDraft();updateDisabled();}});
 function clearDraft(){if(draftUrl)URL.revokeObjectURL(draftUrl);draftUrl=null;draft=null;panel.querySelector('[data-draft]')?.replaceChildren();}
 function renderDraft(){const area=panel.querySelector('[data-draft]');if(!area||!draft)return;const retry=btn('Ghi lại',()=>{clearDraft();updateDisabled();media.start();});retry.dataset.action='';area.replaceChildren(paragraph('Nghe lại trước khi gửi'),el('audio',{controls:true,src:draftUrl,'aria-label':'Bản ghi câu trả lời'}),retry);}
 function updateDisabled(){
  const recording=audioState==='recording',locked=busy||!['idle','recording'].includes(audioState);
  panel.querySelectorAll('[data-action]').forEach(b=>{b.disabled=locked||recording;});
  const rec=panel.querySelector('[data-record]');if(rec)rec.disabled=locked||Boolean(pending);
  const text=panel.querySelector('[data-answer]');if(text)text.disabled=locked||recording||Boolean(draft)||Boolean(pending);
  const send=panel.querySelector('[data-send]');if(send){send.disabled=locked||recording||(!draft&&!text?.value.trim()&&!pending);send.textContent=busy?'AI đang lắng nghe…':pending?'Thử gửi lại':'Gửi câu trả lời →';}
 }
 async function refresh(){meta=await request('/ai-chat?level='+level);selected=meta.lessons.find(l=>l.id===(selected?.id||params.get('lesson')))||meta.lessons[0];}
 function header(){return el('header',{class:'ai-chat-hero'},[el('div',{},[el('span',{class:'ai-chat-tag',text:admin?'GÓC SOẠN HỘI THOẠI':'MỖI NGÀY MỘT CUỘC TRÒ CHUYỆN'}),el('h2',{text:'Cùng Sư tử nói tiếng Trung'}),paragraph(admin?'Soạn đúng bài, xem như học sinh và theo dõi tổng kết.':'Nghe một câu, nói một câu. Sư tử sẽ cùng bạn tiếp nối câu chuyện.')]),el('img',{src:'/assets/images/mascot-lion.svg',alt:'Sư tử đồng hành',width:126,height:138})]);}
 function renderSetup(){
  session=null;media.stopSpeaking();content.replaceChildren(header());
  const grid=el('div',{class:'ai-chat-setup-grid'}),setup=el('section',{class:'ai-chat-card'}),aside=el('aside',{class:'ai-chat-card ai-chat-how'});content.append(grid);grid.append(setup,aside);
  if(!meta.lessons.length){setup.append(el('h3',{text:'Cấp này đang chuẩn bị bài học'}),paragraph('Cô cần xuất bản một bài học trước khi mở hội thoại.'));return;}
  const chooser=field(admin?'Chọn bài để soạn':'Hôm nay bạn muốn luyện bài nào?','lesson',selected.id,'text',meta.lessons.map(l=>[l.id,l.title]));
  chooser.querySelector('select').addEventListener('change',e=>{selected=meta.lessons.find(l=>l.id===e.target.value);params.set('lesson',selected.id);history.replaceState(null,'','?'+params);startId=crypto.randomUUID();renderSetup();});setup.append(chooser);
  const scenario=chatScenarios.find(s=>s.id===selected.settings.scenario_id);setup.append(el('div',{class:'ai-chat-scene'},[el('span',{class:'ai-chat-scene-icon',text:scenario.icon,'aria-hidden':'true'}),el('div',{},[el('h3',{text:scenario.title}),paragraph(selected.settings.goal)])]));
  const begin=btn(admin?'▶ Thử như học sinh':'Bắt đầu trò chuyện →',async()=>{
   alert.textContent='';begin.disabled=true;
   try{session=await request('/ai-chat/sessions','POST',{lesson_id:selected.id,request_id:startId});clearDraft();pending=null;renderConversation();media.speak(session.reply.reply_zh);}catch(e){showError(e);}finally{begin.disabled=false;}
  },true);begin.disabled=!meta.configured||(!admin&&!selected.settings.enabled)||meta.remaining===0;
  setup.append(paragraph(`${meta.remaining}/${meta.limits.daily} buổi còn lại hôm nay · Tối đa ${selected.settings.max_turns} câu trả lời/buổi`,'ai-chat-quota'),begin);
  if(!meta.configured)setup.append(paragraph(meta.reason,'ai-chat-alert'));else if(!selected.settings.enabled&&!admin)setup.append(paragraph('Cô đang chuẩn bị tình huống của bài này. Con chọn bài khác nhé.'));
  aside.append(el('h3',{text:'Một góc nhỏ để tự tin hơn'}),el('ol',{},['Nghe Sư tử hỏi bằng tiếng Trung.','Bấm micro hoặc gõ câu trả lời.','Kết thúc và xem điều mình đã làm tốt.'].map(t=>el('li',{text:t}))),paragraph('Chữ, bản dịch và gợi ý chỉ hiện khi bạn chủ động mở.','ai-chat-footnote'),paragraph('Ghi âm tối đa 20 giây/lượt. Web không lưu bản ghi âm; âm thanh chỉ gửi tới Groq khi bạn bấm Gửi. Kết thúc buổi, cô nhận tổng kết bằng chữ.','ai-chat-footnote'));
  if(admin)renderTeacher(setup);
 }
 function renderTeacher(setup){
  const details=el('details',{class:'ai-chat-teacher',open:true},[el('summary',{text:'✎ Soạn tình huống cho bài này'})]),form=el('form'),s=selected.settings;
  const enabled=el('input',{type:'checkbox',name:'enabled'});enabled.checked=s.enabled;form.append(el('label',{class:'ai-chat-enable'},[enabled,'Cho học sinh luyện tình huống này']));
  const scenario=field('Tình huống','scenario_id',s.scenario_id,'text',chatScenarios.map(v=>[v.id,v.icon+' '+v.title]));
  form.append(scenario,field('Mục tiêu giao tiếp','goal',s.goal,'textarea'),field('Câu mở đầu bằng tiếng Trung','opening',s.opening,'textarea'),field('Nghĩa câu mở đầu (chỉ hiện khi bấm dịch)','translation',s.translation,'textarea'),field('Từ cần luyện (ngăn cách bằng dấu phẩy)','required_words',s.required_words.join(', '),'textarea'),field('Số câu trả lời trong một buổi','max_turns',s.max_turns,'number'));
  for(const [name,max]of [['goal',350],['opening',200],['translation',300],['required_words',800]])form.elements[name].maxLength=max;form.elements.max_turns.min=2;form.elements.max_turns.max=10;
  scenario.querySelector('select').onchange=e=>{const item=chatScenarios.find(v=>v.id===e.target.value);for(const key of ['goal','opening','translation'])form.elements[key].value=item[key];};
  const save=el('button',{type:'submit',class:'btn btn-primary',text:'Lưu tình huống'});form.append(save,paragraph('Lưu xong, bấm “Thử như học sinh” để xem câu hỏi sẽ xuất hiện ở đâu. Buổi thử không đưa vào báo cáo học sinh.','ai-chat-footnote'));
  form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{const data=Object.fromEntries(new FormData(form));await request('/ai-chat/lessons/'+selected.id,'PUT',{...data,enabled:enabled.checked,required_words:data.required_words.split(/[,，\n]/).map(v=>v.trim()).filter(Boolean),max_turns:Number(data.max_turns)});await refresh();renderSetup();alert.textContent='Đã lưu. Học sinh sẽ thấy tình huống vừa soạn.';}catch(e){showError(e);}finally{save.disabled=false;}};details.append(form);setup.append(details);
  const reports=el('details',{class:'ai-chat-reports'},[el('summary',{text:'☷ Tổng kết học sinh gửi về'})]),out=el('div');reports.append(out);content.append(reports);
  reports.addEventListener('toggle',async()=>{if(!reports.open)return;out.textContent='Đang tải tổng kết…';try{const rows=await request('/ai-chat/results?level='+level);out.replaceChildren();if(!rows.length)out.append(paragraph('Chưa có buổi trò chuyện hoàn thành. Tổng kết sẽ xuất hiện tại đây khi học sinh kết thúc.'));for(const row of rows){const item=el('details',{class:'ai-chat-report'},[el('summary',{text:`${row.display_name||row.username} · ${row.lesson_title} · ${row.turn_count} lượt · ${new Date(row.created_at).toLocaleString('vi-VN')}`})]);item.append(summaryCard(row.summary,{report:true,turns:row.turn_count}));out.append(item);}}catch(e){out.textContent=e.message;}});
 }
 function renderConversation(){
  if(!session||disposed)return;clearDraft();content.replaceChildren(header());
  if(session.status!=='active'){content.append(summaryCard(session.summary,{preview:session.is_preview,turns:session.turn_count}),btn('Về chọn bài',async()=>{try{await refresh();startId=crypto.randomUUID();renderSetup();}catch(e){showError(e);}},true));return;}
  const room=el('section',{class:'ai-chat-room'}),progress=el('div',{class:'ai-chat-progress'},[el('span',{text:session.lesson_title}),el('strong',{text:`${session.turn_count}/${session.max_turns} câu trả lời`})]);room.append(progress);
  if(session.is_preview)room.append(paragraph('Chế độ admin thử bài · Không ghi vào báo cáo học sinh','ai-chat-preview'));
  const bubble=el('div',{class:'ai-chat-bubble'},[el('span',{class:'ai-chat-tag',text:'SƯ TỬ ĐANG HỎI BẠN'}),el('h3',{text:'Lắng nghe rồi trả lời nhé'}),el('div',{class:'ai-chat-wave','aria-hidden':'true'},Array.from({length:7},()=>el('i')))]),tools=el('div',{class:'ai-chat-tools'});
  for(const [label,slow]of [['▶ Nghe lại',false],['▷ Nghe chậm',true]]){const b=btn(label,()=>media.speak(session.reply.reply_zh,slow));b.dataset.action='';tools.append(b);}bubble.append(tools);
  for(const [label,text,lang]of [['Hiện chữ tiếng Trung',session.reply.reply_zh,'zh-CN'],['Dịch nghĩa khi cần',session.reply.translation_vi,'vi'],['Gợi ý khi bí',session.reply.hint_zh,'zh-CN']]){if(!text)continue;const d=el('details',{class:'ai-chat-help'},[el('summary',{text:label}),paragraph(text)]);d.lastElementChild.lang=lang;bubble.append(d);}room.append(bubble);
  if(session.transcript)room.append(el('details',{class:'ai-chat-recognized'},[el('summary',{text:'Câu vừa trả lời / AI đã nghe được'}),el('p',{text:session.transcript,lang:'zh-CN'}),paragraph('Nhận diện có thể sai. Nếu cần, hãy nói rõ lại trong câu trả lời tiếp theo.','ai-chat-footnote')]));
  const composer=el('form',{class:'ai-chat-composer'}),label=el('label',{class:'chinese-field'},[el('span',{text:'Đến lượt bạn'}),el('textarea',{'data-answer':'',rows:2,maxlength:400,placeholder:'Gõ câu trả lời tiếng Trung hoặc dùng micro…',lang:'zh-CN'})]);label.lastElementChild.oninput=()=>{alert.textContent='';updateDisabled();};composer.append(label);
  const controls=el('div',{class:'ai-chat-compose-actions'}),record=btn('● Ghi âm trả lời',()=>{alert.textContent='';if(audioState==='recording')media.stop();else{clearDraft();media.start();}});record.dataset.record='';
  const send=el('button',{type:'submit',class:'btn btn-primary','data-send':'',text:'Gửi câu trả lời →'});controls.append(record,send);composer.append(controls,el('div',{'data-draft':'',class:'ai-chat-draft'}),paragraph('Nói tối đa 20 giây. Nghe lại bản ghi rồi bấm Gửi; chưa gửi thì âm thanh chỉ ở trong trang này.','ai-chat-footnote'));composer.onsubmit=async e=>{e.preventDefault();await submitAnswer();};room.append(composer);
  const finish=btn('Kết thúc & gửi tổng kết cho cô',async()=>{if(busy||audioState!=='idle')return;busy=true;updateDisabled();media.stopSpeaking();alert.textContent='';try{session=await request('/ai-chat/sessions/'+session.id+'/finish','POST',{});pending=null;renderConversation();}catch(e){showError(e);}finally{busy=false;updateDisabled();}});finish.dataset.action='';room.append(finish,paragraph('Buổi luyện tối đa 30 phút. Nếu rời trang, bạn có thể quay lại tiếp tục buổi còn hạn.','ai-chat-footnote'));content.append(room);updateDisabled();room.scrollIntoView({block:'start'});
 }
 async function submitAnswer(){
  if(busy||audioState!=='idle'||!session)return;const answer=panel.querySelector('[data-answer]');if(!pending&&!draft&&!answer?.value.trim())return;
  if(!pending)pending={id:crypto.randomUUID(),turn:session.turn_count+1,blob:draft,text:draft?null:answer.value.trim()};busy=true;alert.textContent='';media.stopSpeaking();updateDisabled();
  try{const body=pending.blob?new FormData():{text:pending.text};if(pending.blob)body.append('audio',pending.blob,'answer.wav');session=await request(`/ai-chat/sessions/${session.id}/turns/${pending.turn}/${pending.id}/${pending.blob?'audio':'text'}`,'POST',body);pending=null;renderConversation();if(session.status==='active')media.speak(session.reply.reply_zh);}
  catch(e){showError(e);if(['CHAT_NO_SPEECH','CHAT_AUDIO_LIMIT','CHAT_AUDIO_REQUIRED','VALIDATION_ERROR'].includes(e.code))pending=null;
   if(['CHAT_EXPIRED','CHAT_FINISHED','CHAT_STALE_TURN'].includes(e.code)){try{session=await request('/ai-chat/sessions/'+session.id);pending=null;renderConversation();}catch{}}
   if(pending&&!panel.querySelector('[data-discard]')){const discard=btn('Bỏ câu này để trả lời lại',()=>{pending=null;clearDraft();if(answer)answer.value='';discard.remove();alert.textContent='';updateDisabled();});discard.dataset.discard='';panel.querySelector('.ai-chat-composer')?.append(discard);}
  }finally{busy=false;updateDisabled();}
 }
 function dispose(){disposed=true;media.dispose();clearDraft();window.removeEventListener('pagehide',dispose);}window.addEventListener('pagehide',dispose);
 content.append(header(),paragraph('Đang mở góc trò chuyện…'));
 try{await refresh();if(disposed)return;if(meta.active){session=meta.active;renderConversation();}else renderSetup();}catch(e){content.replaceChildren(header(),paragraph('Chưa mở được phần giao tiếp.'));showError(e);content.append(btn('Thử tải lại',()=>location.reload()));}
 return dispose;
}
