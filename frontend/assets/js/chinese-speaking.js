import {el,link} from './chinese-common.js';
import {stopQuestionAudio} from './question-audio.js';
import {speakingQuestions,speakingSettings,speakingTime,speakingStamp,speakingFilename,speakingError} from './chinese-speaking-data.js';
import {speakingSupported,createSpeakingMedia} from './chinese-speaking-media.js';
import {speakingView} from './chinese-speaking-view.js';
import {speakingAssessment} from './chinese-speaking-assessment.js';

export function mountSpeaking(host,{set,activities,items=[],profile}){
 if(!document.querySelector('link[data-speaking-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/chinese-speaking.css','data-speaking-style':'true'}));
 const questions=speakingQuestions(activities,items),settings=speakingSettings(set);
 if(!questions.length){host.append(el('section',{class:'card'},[el('h2',{text:'Luyện nói theo bài'}),el('p',{text:'Bài này chưa có câu hỏi phù hợp để luyện nói. Giáo viên cần thêm và đăng câu hỏi tiếng Trung trong mục Luyện nói.'}),link('Về bài học',{set:set.id})]));return;}
 let phase='idle',counts=questions.map(()=>0),heard=new Set(),current=-1,playing=false,result=null,timer,started=0,disposed=false,generation=0,abort,reason='',meta=null,takeFailed=false,activeAnswer=null,assessing=false;
 const ui=speakingView(host,{profile,set,count:questions.length,settings}),supported=speakingSupported();
 const busy=()=>['opening','loading','recording','saving'].includes(phase);
 const media=createSpeakingMedia(ui.level,{onRecorded:ended,onFailure:failed});
 const assessment=speakingAssessment(ui,{set,profile,onBusy:value=>{assessing=value;update();}});
 function update(text){
  if(disposed)return;ui.shell.dataset.phase=phase;ui.result.hidden=!result||busy();
  ui.microphone.disabled=!supported||busy()||assessing;ui.microphone.textContent=media.ready?'Tắt micro':'Bật micro';
  ui.record.hidden=Boolean(result)||['recording','saving'].includes(phase);ui.record.disabled=!supported||!media.ready||busy()||assessing;
  ui.stop.hidden=phase!=='recording';ui.stop.disabled=phase!=='recording';ui.retake.disabled=!supported||busy()||assessing;
  const next=questions.findIndex((_,index)=>!heard.has(index));
  for(const [index,row]of ui.questionButtons.entries()){
   row.button.disabled=phase!=='recording'||playing||counts[index]>=2||(settings.order==='sequential'&&next>=0&&index>next);
   row.button.setAttribute('aria-current',index===current?'step':'false');row.button.classList.toggle('has-heard',heard.has(index));row.detail.textContent=(heard.has(index)?'Đã nghe':'Chưa nghe')+` · ${counts[index]}/2`;
  }
  ui.counter.textContent=`Đã nghe ${heard.size} / ${questions.length} câu`;
  ui.listenCount.textContent=settings.order==='free'?'Chọn câu muốn nghe. Mỗi câu tối đa 2 lần.':'Nghe theo thứ tự cô giao. Mỗi câu tối đa 2 lần.';
  ui.state.textContent={opening:'Đang mở micro…',loading:'Đang tải giọng đọc…',recording:'● Đang ghi âm',saving:'Đang tạo bản ghi…',review:'Đã có bản ghi'}[phase]||(media.ready?'Micro đã sẵn sàng':'Sẵn sàng luyện tập');
  ui.download.setAttribute('aria-disabled',String(busy()));if(text!==undefined)ui.status.textContent=text;
 }
 function clearTimer(){clearInterval(timer);timer=null;}
 function closeAnswer(){if(activeAnswer&&meta){meta.answer_segments.push({...activeAnswer,end:(performance.now()-started)/1000});activeAnswer=null;}}
 function ended(blob,recordedMeta){
  clearTimer();playing=false;if(disposed)return;media.close();
  if(!blob.size||takeFailed&&result){phase=result?'review':'idle';update(result?'Lượt ghi mới bị gián đoạn. Bản ghi trước vẫn nghe và tải được.':'Chưa tạo được bản ghi. Hãy thử ghi âm lại.');return;}
  if(result){URL.revokeObjectURL(result.url);result.audio=null;}
  const snapshot=structuredClone(recordedMeta);result={url:URL.createObjectURL(blob),blob,meta:snapshot,audio:blob};phase='review';assessment.attach(result);
  ui.resultAudio.src=result.url;ui.download.href=result.url;ui.download.download=speakingFilename(snapshot,blob.type);
  ui.resultQuestion.textContent=`Đã nghe ${snapshot.heard_count}/${snapshot.total} câu`+(snapshot.heard_count<snapshot.total?' · Chưa nghe đủ câu hỏi cô giao':' · Bạn nghe lại phần trả lời nhé!');
  ui.timeline.replaceChildren(...snapshot.questions.map((question,index)=>{const event=snapshot.timeline.find(item=>item.index===index+1);return el('li',{text:`${event?speakingTime(event.seconds):'Chưa nghe'} · Câu ${index+1}: ${question}`});}));
  ui.resultInfo.textContent=`Mã lượt ${snapshot.code} · ${snapshot.date} · ${(blob.size/1024/1024).toFixed(1)} MB · ${speakingFilename(snapshot,blob.type).split('.').at(-1).toUpperCase()}`;
  update((reason?reason+' ':'')+'Bản ghi đã sẵn sàng. Nghe lại, ghi âm lại nếu cần hoặc bấm AI chấm bài.');
 }
 function failed(error){
  if(disposed||error.name==='AbortError')return;playing=false;
  if(phase==='recording'){takeFailed=true;stop(speakingError(error));}
  else{clearTimer();media.close();phase=result?'review':'idle';update(speakingError(error));}
 }
 async function listen(index){
  if(ui.questionButtons[index].button.disabled||phase!=='recording')return;
  closeAnswer();const token=generation;playing=true;current=index;counts[index]++;
  meta.timeline.push({index:index+1,seconds:Math.floor((performance.now()-started)/1000)});ui.heading.textContent='Đang nghe câu '+(index+1);update('Đang đọc câu '+(index+1)+'. Bạn nghe nhé…');
  try{
   await media.playQuestion(questions[index].text);if(disposed||token!==generation||phase!=='recording')return;
   heard.add(index);meta.heard_count=heard.size;activeAnswer={index:index+1,start:(performance.now()-started)/1000};ui.heading.textContent='Trả lời câu '+(index+1);
   update(heard.size===questions.length?'Đến lượt bạn! Trả lời câu cuối rồi bấm Dừng ghi âm.':'Đến lượt bạn! Trả lời bằng tiếng Trung rồi bấm nghe câu tiếp theo.');
  }catch(error){failed(error);}finally{if(token===generation){playing=false;update();}}
 }
 function stop(message=''){
  if(phase!=='recording')return;closeAnswer();reason=message;clearTimer();phase='saving';media.stop();update('Đang tạo bản ghi để nghe lại…');
 }
 ui.microphone.onclick=async()=>{
  if(busy()||assessing||disposed)return;
  if(media.ready){media.close();phase=result?'review':'idle';update('Micro đã tắt.');return;}
  phase='opening';update('Hãy cho phép dùng micro trong trình duyệt.');
  try{if(await media.open()){phase=result?'review':'idle';update('Micro đã sẵn sàng. Bấm Bắt đầu ghi âm rồi nghe từng câu hỏi.');}}catch(error){failed(error);}
 };
 const start=async()=>{
  if(busy()||assessing||disposed||!supported)return;const token=++generation;abort?.abort();abort=new AbortController();reason='';takeFailed=false;playing=false;activeAnswer=null;stopQuestionAudio();ui.resultAudio.pause();
  try{
   if(!media.ready){phase='opening';update('Đang bật micro để ghi âm lại bài…');if(!await media.open())return;}
   if(disposed||token!==generation)return;phase='loading';update('Đang chuẩn bị âm thanh cho tất cả câu hỏi…');
   await media.prepare(questions,abort.signal);if(disposed||token!==generation)return;
   meta={...speakingStamp(profile,set),total:questions.length,questions:questions.map(question=>question.text),heard_count:0,timeline:[],answer_segments:[],duration_seconds:settings.duration_seconds};
   started=performance.now();media.record(meta);counts=questions.map(()=>0);heard=new Set();current=-1;phase='recording';ui.progress.value=0;ui.clock.textContent='Còn '+speakingTime(settings.duration_seconds);ui.heading.textContent='Bấm nghe câu hỏi để bắt đầu';
   update(settings.order==='free'?'Đang ghi âm. Chọn câu muốn nghe rồi trả lời bằng tiếng Trung.':'Đang ghi âm. Bấm Nghe câu 1 rồi trả lời bằng tiếng Trung.');
   timer=setInterval(()=>{const seconds=Math.min(settings.duration_seconds,Math.floor((performance.now()-started)/1000));ui.progress.value=seconds;ui.clock.textContent='Còn '+speakingTime(settings.duration_seconds-seconds);if(seconds>=settings.duration_seconds)stop(`Đã đủ ${settings.duration_seconds} giây.`);},100);
  }catch(error){failed(error);}
 };
 ui.record.onclick=start;ui.retake.onclick=start;ui.stop.onclick=()=>stop();ui.questionButtons.forEach((row,index)=>{row.button.onclick=()=>listen(index);});
 ui.download.onclick=event=>{if(busy()||!result){event.preventDefault();return;}update('Đã yêu cầu tải bản ghi. Kết quả chấm AI được gửi riêng cho cô.');};
 const unload=event=>{if(phase==='recording'||assessing){event.preventDefault();event.returnValue='';}};
 const visibility=()=>{
  if(!document.hidden||disposed)return;generation++;abort?.abort();ui.resultAudio.pause();
  if(phase==='recording')stop('Ghi âm dừng vì bạn rời màn hình.');else if(phase==='loading'||phase==='opening'){phase=result?'review':'idle';update('Đã dừng chuẩn bị. Bật lại micro để tiếp tục.');}
  media.close();update();
 };
 function dispose(){if(disposed)return;disposed=true;generation++;abort?.abort();clearTimer();assessment.dispose();media.dispose();ui.resultAudio.pause();ui.resultAudio.removeAttribute('src');ui.resultAudio.load();if(result){URL.revokeObjectURL(result.url);result.audio=null;}result=null;observer.disconnect();window.removeEventListener('beforeunload',unload);window.removeEventListener('pagehide',dispose);document.removeEventListener('visibilitychange',visibility);}
 const observer=new MutationObserver(()=>{if(!ui.shell.isConnected)dispose();});observer.observe(document.documentElement,{childList:true,subtree:true});
 window.addEventListener('beforeunload',unload);window.addEventListener('pagehide',dispose);document.addEventListener('visibilitychange',visibility);
 update(supported?undefined:'Trình duyệt này chưa hỗ trợ ghi âm. Hãy mở website HTTPS bằng Chrome hoặc Safari mới và cho phép dùng micro.');return dispose;
}
