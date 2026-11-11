import {drawSpeakingFrame} from './chinese-speaking-frame.js';

export function speakingSupported(){
 return Boolean(window.isSecureContext&&navigator.mediaDevices?.getUserMedia&&window.MediaRecorder&&(window.AudioContext||window.webkitAudioContext)&&HTMLCanvasElement.prototype.captureStream);
}
export function createSpeakingMedia(video,{onRecorded,onFailure}){
 let input,context,mix,microphone,source,buffer,recorder,capture,frame=0,disposed=false,opening=0;
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=800;
 const ctx=canvas.getContext('2d',{alpha:false});
 function stopQuestion(){if(source){const old=source;source=null;try{old.stop();}catch{}old.disconnect();}}
 function stop(){stopQuestion();if(recorder?.state==='recording')recorder.stop();}
 function close(){
  opening++;stop();input?.getTracks().forEach(t=>t.stop());input=null;video.srcObject=null;
  mix?.stream.getTracks().forEach(t=>t.stop());
  microphone?.disconnect();microphone=null;buffer=null;
  const previous=context;context=null;mix=null;previous?.close().catch(()=>{});
 }
 async function open(){
  const token=++opening;
  const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:24},facingMode:'user'}});
  if(disposed||token!==opening){acquired.getTracks().forEach(t=>t.stop());return false;}
  try{
   input=acquired;video.srcObject=input;await video.play();
   if(disposed||token!==opening){acquired.getTracks().forEach(t=>t.stop());if(input===acquired)close();return false;}
   const Audio=window.AudioContext||window.webkitAudioContext;context=new Audio();mix=context.createMediaStreamDestination();
   microphone=context.createMediaStreamSource(input);microphone.connect(mix);
   for(const track of input.getTracks())track.addEventListener('ended',()=>{if(!disposed){close();onFailure(new Error('Camera hoặc microphone vừa bị ngắt. Hãy bật lại để tiếp tục.'));}},{once:true});
   return true;
  }catch(error){acquired.getTracks().forEach(t=>t.stop());close();throw error;}
 }
 async function prepare(text,signal){
  const audio=context;if(!audio)throw Error('Hãy bật camera và microphone trước.');
  await audio.resume();
  const request=new AbortController(),cancel=()=>request.abort();signal.addEventListener('abort',cancel,{once:true});
  if(signal.aborted)request.abort();const timeout=setTimeout(cancel,18000);
  try{
   const result=await fetch('/api/v1/question-audio',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang:'zh-CN'}),signal:request.signal});
   if(!result.ok)throw Error('Chưa tải được giọng đọc câu hỏi. Hãy kiểm tra mạng và bấm quay lại.');
   const bytes=await result.arrayBuffer();if(signal.aborted)throw new DOMException('Aborted','AbortError');
   let decoded;try{decoded=await audio.decodeAudioData(bytes);}catch{throw Error('Chưa đọc được âm thanh câu hỏi. Hãy bấm quay lại để thử lần nữa.');}
   if(signal.aborted||disposed||audio!==context)throw new DOMException('Aborted','AbortError');buffer=decoded;
  }catch(error){if(request.signal.aborted&&!signal.aborted)throw Error('Tải giọng đọc quá lâu. Hãy kiểm tra mạng và bấm quay lại.');throw error;}
  finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);}
 }
 function playQuestion(){
  if(!buffer||!context||!mix)return Promise.reject(Error('Giọng đọc chưa sẵn sàng.'));
  stopQuestion();
  return new Promise(resolve=>{
   const current=context.createBufferSource();source=current;current.buffer=buffer;current.playbackRate.value=.85;
   // Question playback goes both to the learner and the recorded audio mix.
   current.connect(context.destination);current.connect(mix);current.onended=()=>{if(source===current)source=null;current.disconnect();resolve();};current.start();
  });
 }
 function record(meta){
  if(!input||!mix||disposed)throw Error('Camera chưa sẵn sàng. Hãy bật lại camera.');
  const began=performance.now(),paint=()=>{drawSpeakingFrame(ctx,video,meta,(performance.now()-began)/1000);frame=requestAnimationFrame(paint);};
  paint();capture=canvas.captureStream(20);
  const output=new MediaStream([...capture.getVideoTracks(),...mix.stream.getAudioTracks()]);
  const types=['video/mp4','video/webm;codecs=vp8,opus','video/webm'].filter(t=>MediaRecorder.isTypeSupported(t));
  if(!types.length){cancelAnimationFrame(frame);capture.getTracks().forEach(t=>t.stop());throw Error('Trình duyệt chưa hỗ trợ ghi video. Hãy thử Chrome hoặc Safari mới.');}
  let last;
  for(const mimeType of types){
   try{
    const current=new MediaRecorder(output,{mimeType,videoBitsPerSecond:650000,audioBitsPerSecond:32000}),chunks=[];
    current.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    current.onstop=()=>{cancelAnimationFrame(frame);capture?.getVideoTracks().forEach(t=>t.stop());stopQuestion();if(!disposed)onRecorded(new Blob(chunks,{type:current.mimeType}),meta);};
    current.onerror=()=>{stop();if(!disposed)onFailure(Error('Bản ghi bị gián đoạn. Hãy thử quay lại bằng trình duyệt mới nhất.'));};
    recorder=current;current.start(250);return;
   }catch(error){last=error;}
  }
  cancelAnimationFrame(frame);capture.getVideoTracks().forEach(t=>t.stop());throw last;
 }
 return {open,close,prepare,record,playQuestion,stop,stopQuestion,get ready(){return Boolean(input?.active&&context);},dispose(){disposed=true;close();cancelAnimationFrame(frame);capture?.getVideoTracks().forEach(t=>t.stop());}};
}
