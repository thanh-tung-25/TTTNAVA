import {el,link} from './chinese-common.js';
import {stopQuestionAudio} from './question-audio.js';
import {speakingQuestions,shuffledQuestions,speakingStamp,speakingFilename,speakingError,SPEAKING_SECONDS} from './chinese-speaking-data.js';
import {speakingSupported,createSpeakingMedia} from './chinese-speaking-media.js';
import {speakingView} from './chinese-speaking-view.js';

export function mountSpeaking(host,{set,activities,items=[],profile}){
 if(!document.querySelector('link[data-speaking-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/chinese-speaking.css','data-speaking-style':'true'}));
 const source=speakingQuestions(activities,items);
 if(!source.length){host.append(el('section',{class:'card'},[el('h2',{text:'Luyện nói theo bài'}),el('p',{text:'Bài này chưa có câu hỏi phù hợp để luyện nói. Giáo viên cần thêm và đăng câu hỏi tiếng Trung trong mục Luyện nói.'}),link('Về bài học',{set:set.id})]));return;}
 let deck=shuffledQuestions(source),index=0,phase='idle',listens=0,playing=false,result=null,downloaded=false,timer,started=0,disposed=false,generation=0,abort,reason='';
 const ui=speakingView(host,{profile,set,count:deck.length}),supported=speakingSupported();
 const busy=()=>['opening','loading','recording','saving'].includes(phase);
 function update(text){
  if(disposed)return;ui.shell.dataset.phase=phase;
  ui.result.hidden=!result||['loading','recording','saving'].includes(phase);
  ui.camera.disabled=!supported||busy()||phase==='complete';ui.camera.textContent=media.ready?'Tắt camera':'Bật camera & micro';ui.placeholder.hidden=media.ready;
  ui.record.disabled=!supported||!media.ready||busy()||phase==='complete';ui.record.textContent=result?'Quay lại câu này':'Bắt đầu quay';ui.record.hidden=['recording','saving'].includes(phase);
  ui.stop.hidden=phase!=='recording';ui.stop.disabled=phase!=='recording';
  ui.listen.disabled=phase!=='recording'||playing||listens>=2;
  ui.listenCount.textContent=listens?`Đã nghe ${listens}/2 lần trong bản ghi này.`:'Bắt đầu quay để nghe câu hỏi.';
  ui.state.textContent={opening:'Đang mở camera…',loading:'Đang chuẩn bị…',recording:'● Đang quay',saving:'Đang tạo video…',review:'Đã có bản ghi',complete:'Đã hoàn thành'}[phase]||(media.ready?'Camera đã sẵn sàng':'Sẵn sàng luyện tập');
  ui.next.disabled=!result||!downloaded||busy();ui.next.textContent=phase==='complete'?'Luyện lượt mới':index===deck.length-1?'Hoàn thành lượt luyện':'Câu tiếp theo →';
  ui.download.setAttribute('aria-disabled',String(busy()));if(text!==undefined)ui.status.textContent=text;
 }
 function clearTimer(){clearInterval(timer);timer=null;}
 function ended(blob,meta){
  clearTimer();playing=false;if(disposed)return;
  if(!blob.size){phase=result?'review':'idle';update('Chưa tạo được bản ghi. Hãy thử quay lại.');return;}
  if(result)URL.revokeObjectURL(result.url);
  result={url:URL.createObjectURL(blob),blob,meta};downloaded=false;phase='review';
  ui.result.hidden=false;ui.resultVideo.src=result.url;ui.download.href=result.url;ui.download.download=speakingFilename(meta,blob.type);
  ui.resultQuestion.textContent=meta.question;ui.resultInfo.textContent=`Mã lượt ${meta.code} · ${meta.date} · ${(blob.size/1024/1024).toFixed(1)} MB · ${blob.type.includes('mp4')?'MP4':'WebM'}`;
  update((reason?reason+' ':'')+'Video đã sẵn sàng. Hãy xem lại và tải về máy.');
 }
 function failed(error){
  if(disposed||error.name==='AbortError')return;clearTimer();playing=false;
  if(phase==='recording'){reason=speakingError(error);phase='saving';media.stop();update(reason);}
  else{phase=result?'review':'idle';update(speakingError(error));}
 }
 const media=createSpeakingMedia(ui.live,{onRecorded:ended,onFailure:failed});
 async function listen(){
  if(phase!=='recording'||playing||listens>=2)return;
  const token=generation;playing=true;listens++;update('Đang đọc câu hỏi. Bạn nghe nhé…');
  try{await media.playQuestion();if(!disposed&&token===generation&&phase==='recording')update('Đến lượt bạn! Trả lời bằng tiếng Trung rồi bấm Dừng quay.');}
  catch(error){failed(error);}finally{if(token===generation){playing=false;update();}}
 }
 function stop(message=''){
  if(phase!=='recording')return;reason=message;clearTimer();phase='saving';media.stop();update('Đang tạo video để tải về…');
 }
 ui.camera.onclick=async()=>{
  if(busy()||disposed)return;
  if(media.ready){media.close();phase=result?'review':'idle';update('Camera và microphone đã tắt.');return;}
  phase='opening';update('Hãy cho phép camera và microphone trong trình duyệt.');
  try{if(await media.open()){phase=result?'review':'idle';update('Camera đã sẵn sàng. Bấm Bắt đầu quay để nghe câu hỏi.');}}catch(error){failed(error);}
 };
 ui.record.onclick=async()=>{
  if(!media.ready||busy()||disposed||phase==='complete')return;
  const token=++generation;abort?.abort();abort=new AbortController();reason='';listens=0;playing=false;phase='loading';stopQuestionAudio();ui.resultVideo.pause();update('Đang chuẩn bị giọng đọc tiếng Trung…');
  try{
   await media.prepare(deck[index].text,abort.signal);if(disposed||token!==generation)return;
   const meta={...speakingStamp(profile,set,index),question:deck[index].text};
   started=performance.now();media.record(meta);phase='recording';ui.progress.value=0;ui.clock.textContent='00:00 / 00:30';update();
   timer=setInterval(()=>{const seconds=Math.min(SPEAKING_SECONDS,Math.floor((performance.now()-started)/1000));ui.progress.value=seconds;ui.clock.textContent=`00:${String(seconds).padStart(2,'0')} / 00:30`;if(seconds>=SPEAKING_SECONDS)stop('Đã đủ 30 giây.');},100);
   await listen();
  }catch(error){failed(error);}
 };
 ui.stop.onclick=()=>stop();ui.listen.onclick=listen;
 ui.download.onclick=event=>{
  if(busy()||!result){event.preventDefault();return;}
  downloaded=true;update('Đã yêu cầu tải video. Kiểm tra tệp trong máy rồi gửi qua Zalo cho giáo viên.');
 };
 function clearResult(){if(result)URL.revokeObjectURL(result.url);result=null;downloaded=false;ui.resultVideo.pause();ui.resultVideo.removeAttribute('src');ui.resultVideo.load();ui.result.hidden=true;}
 ui.next.onclick=()=>{
  if(!result||!downloaded||busy())return;
  if(phase==='complete'){clearResult();deck=shuffledQuestions(source);index=0;phase='idle';ui.heading.textContent='Đến lượt bạn nói';}
  else if(index===deck.length-1){phase='complete';media.close();ui.heading.textContent=`Bạn đã luyện xong ${deck.length} câu!`;update('Bạn đã hoàn thành lượt luyện. Hãy gửi các video đã tải qua Zalo.');return;}
  else{index++;clearResult();phase='idle';}
  listens=0;ui.progress.value=0;ui.clock.textContent='00:00 / 00:30';ui.counter.textContent=`Câu ${index+1} / ${deck.length}`;update(media.ready?'Bấm Bắt đầu quay để nghe câu tiếp theo.':'Bật camera để bắt đầu lượt luyện.');ui.record.focus({preventScroll:true});
 };
 const unload=event=>{if(phase==='recording'||result&&!downloaded){event.preventDefault();event.returnValue='';}};
 const visibility=()=>{
  if(!document.hidden||disposed)return;
  generation++;abort?.abort();ui.resultVideo.pause();
  if(phase==='recording')stop('Bản ghi dừng vì bạn rời màn hình.');
  else if(phase==='loading'||phase==='opening'){phase=result?'review':'idle';update('Đã dừng chuẩn bị. Bật lại camera để tiếp tục.');}
  media.close();update();
 };
 function dispose(){if(disposed)return;disposed=true;generation++;abort?.abort();clearTimer();media.dispose();ui.resultVideo.pause();if(result)URL.revokeObjectURL(result.url);observer.disconnect();window.removeEventListener('beforeunload',unload);window.removeEventListener('pagehide',dispose);document.removeEventListener('visibilitychange',visibility);}
 const observer=new MutationObserver(()=>{if(!ui.shell.isConnected)dispose();});observer.observe(document.documentElement,{childList:true,subtree:true});
 window.addEventListener('beforeunload',unload);window.addEventListener('pagehide',dispose);document.addEventListener('visibilitychange',visibility);
 update(supported?undefined:'Trình duyệt này chưa hỗ trợ quay video. Hãy mở website HTTPS bằng Chrome hoặc Safari mới và cho phép camera, microphone.');
 return dispose;
}
