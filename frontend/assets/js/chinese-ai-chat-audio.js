import {encodeSpeakingWav} from './chinese-speaking-audio.js';
export async function chatWav(blob){
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!Offline)throw Error('Thiết bị chưa hỗ trợ gửi ghi âm. Con vẫn có thể nhập chữ để trò chuyện.');
 const audio=await new Offline(1,16000,16000).decodeAudioData(await blob.arrayBuffer());
 const length=Math.min(320000,Math.floor(audio.duration*16000)),samples=new Float32Array(length);
 try{
  for(let c=0;c<audio.numberOfChannels;c++){
   const source=audio.getChannelData(c);
   for(let i=0;i<length;i++)samples[i]+=(source[Math.min(source.length-1,Math.floor(i*audio.sampleRate/16000))]||0)/audio.numberOfChannels;
  }
  if(samples.length<1600)throw Error('Bản ghi quá ngắn. Con ghi lại câu trả lời nhé.');
  return new Blob([encodeSpeakingWav(samples)],{type:'audio/wav'});
 }finally{samples.fill(0);for(let c=0;c<audio.numberOfChannels;c++)audio.getChannelData(c).fill(0);}
}
export function createChatAudio({onState=()=>{},onDraft=()=>{},onError=()=>{},onVoices=()=>{}}={}){
 let stream,recorder,timer,ticker,started,chunks=[],disposed=false,pending=false;
 const synth=window.speechSynthesis,voices=()=>synth?.getVoices().filter(v=>/^zh(?:-|_|$)/i.test(v.lang))||[];
 const notifyVoices=()=>onVoices(voices());
 synth?.addEventListener('voiceschanged',notifyVoices);
 const release=()=>{clearTimeout(timer);clearInterval(ticker);stream?.getTracks().forEach(t=>t.stop());stream=null;};
 function stop(){if(recorder?.state==='recording')recorder.stop();release();}
 function stopSpeaking(){synth?.cancel();}
 async function start(){
  if(pending||recorder?.state==='recording'||disposed)return;
  stopSpeaking();pending=true;onState('permission',0);
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Trình duyệt chưa hỗ trợ ghi âm. Con thử Chrome/Safari mới hoặc dùng ô nhập chữ.');
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(disposed||document.hidden){release();onState('idle',0);return;}
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
   recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{release();chunks=[];onState('idle',0);onError(Error('Ghi âm bị gián đoạn. Con thử ghi lại nhé.'));};
   recorder.onstop=async()=>{
    release();const blob=new Blob(chunks,{type:recorder.mimeType});chunks=[];if(disposed)return;
    onState('preparing',0);
    try{const wav=await chatWav(blob);if(!disposed)onDraft(wav);}catch(e){if(!disposed)onError(e);}finally{if(!disposed)onState('idle',0);}
   };
   recorder.start();started=performance.now();onState('recording',0);
   ticker=setInterval(()=>onState('recording',Math.min(20,Math.floor((performance.now()-started)/1000))),250);timer=setTimeout(stop,20000);
  }catch(e){release();onState('idle',0);onError(e.name==='NotAllowedError'?Error('Con cho phép dùng micro trong trình duyệt rồi thử lại nhé.'):e);}finally{pending=false;}
 }
 function speak(text,slow=false){
  if(disposed||recorder?.state==='recording'||pending)return false;
  const voice=voices().find(v=>/zh[-_]CN/i.test(v.lang))||voices()[0];
  if(!voice||!synth){onError(Error('Máy chưa có giọng đọc tiếng Trung. Con bật Hiện chữ để học tiếp; cài giọng tiếng Trung trong phần ngôn ngữ của máy để nghe.'));return false;}
  stopSpeaking();const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=slow?.65:.9;
  utterance.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))onError(Error('Chưa phát được tiếng. Con bấm Nghe lại hoặc bật Hiện chữ nhé.'));};synth.speak(utterance);return true;
 }
 const hidden=()=>{if(document.hidden){stopSpeaking();stop();}};
 function dispose(){disposed=true;stopSpeaking();stop();chunks=[];synth?.removeEventListener('voiceschanged',notifyVoices);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',dispose);}
 document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',dispose);notifyVoices();
 return {start,stop,speak,stopSpeaking,dispose};
}
