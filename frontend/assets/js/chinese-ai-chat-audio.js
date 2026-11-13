import {encodeSpeakingWav} from './chinese-speaking-audio.js';
export async function chatWav(blob,{from=0}={}){
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!Offline)throw Error('Máy chưa hỗ trợ ghi âm. Bạn có thể dùng ô nhập chữ.');
 const audio=await new Offline(1,16000,16000).decodeAudioData(await blob.arrayBuffer());
 const start=Math.min(audio.duration,Math.max(0,from)),length=Math.min(320000,Math.floor((audio.duration-start)*16000)),samples=new Float32Array(length);
 try{
  for(let c=0;c<audio.numberOfChannels;c++){const source=audio.getChannelData(c);for(let i=0;i<length;i++)samples[i]+=(source[Math.min(source.length-1,Math.floor((start+i/16000)*audio.sampleRate))]||0)/audio.numberOfChannels;}
  if(samples.length<3200)throw Error('Câu nói quá ngắn. Bạn thử nói lại nhé.');
  return new Blob([encodeSpeakingWav(samples)],{type:'audio/wav'});
 }finally{samples.fill(0);for(let c=0;c<audio.numberOfChannels;c++)audio.getChannelData(c).fill(0);}
}
export function createVoiceActivity({silenceMs=1400,threshold=.012}={}){
 let first=null,last=null,candidate=null,noise=0;
 return {sample(rms,now){
  const limit=Math.max(threshold,noise*3);
  if(rms>limit){candidate??=now;if(now-candidate>=120&&first===null)first=candidate;last=now;}
  else{candidate=null;if(first===null)noise=noise*.95+Math.min(rms,.015)*.05;}
  return {speaking:first!==null,first,done:first!==null&&now-last>=silenceMs,limit:first!==null&&now-first>=19500};
 }};
}
export function createChatAudio({onState=()=>{},onTurn=()=>{},onError=()=>{},onIdle=()=>{}}={}){
 let stream,context,analyser,source,sink,recorder,poll,idle,parts=[],capture=0,disposed=false,opening=null,speechResolve,speechTimer,utterance,speechGeneration=0;
 const synth=window.speechSynthesis;
 const voices=()=>synth?.getVoices().filter(v=>/^zh(?:-|_|$)/i.test(v.lang))||[];
 voices();
 function cancelSpeech(){speechGeneration++;clearTimeout(speechTimer);synth?.cancel();utterance=null;const done=speechResolve;speechResolve=null;done?.(false);}
 function stopCapture(send=false){
  clearInterval(poll);clearTimeout(idle);
  if(recorder?.state==='recording'){recorder._send=send;recorder.stop();}
 }
 function close(){
  capture++;stopCapture(false);recorder=null;parts=[];
  stream?.getTracks().forEach(t=>t.stop());stream=null;source?.disconnect();source=null;analyser?.disconnect();analyser=null;sink?.disconnect();sink=null;
  context?.close().catch(()=>{});context=null;
 }
 async function open(){
  if(disposed)return false;
  if(stream?.getTracks().some(t=>t.readyState==='live'))return true;
  if(opening)return opening;
  const version=capture;
  opening=(async()=>{
   let acquired,audio;
   try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder||!Audio)throw Error('Trình duyệt chưa hỗ trợ micro. Bạn thử Chrome/Safari mới hoặc nhập chữ nhé.');
    acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    if(disposed||version!==capture||document.hidden){acquired.getTracks().forEach(t=>t.stop());return false;}
    audio=new Audio();await audio.resume();
    if(disposed||version!==capture||document.hidden){acquired.getTracks().forEach(t=>t.stop());await audio.close();return false;}
    stream=acquired;context=audio;source=context.createMediaStreamSource(stream);analyser=context.createAnalyser();analyser.fftSize=1024;sink=context.createGain();sink.gain.value=0;
    source.connect(analyser);analyser.connect(sink);sink.connect(context.destination);
    for(const track of stream.getTracks())track.onended=()=>{if(!disposed){close();onIdle('Micro đã dừng. Bạn bấm Tiếp tục để mở lại nhé.');}};
    return true;
   }catch(e){acquired?.getTracks().forEach(t=>t.stop());audio?.close().catch(()=>{});throw e.name==='NotAllowedError'?Error('Bạn cho phép dùng micro trong trình duyệt nhé. Hoặc dùng ô nhập chữ bên dưới.'):e;}
   finally{opening=null;}
  })();return opening;
 }
 function listen(){
  if(disposed||!stream||!analyser||recorder?.state==='recording')return false;
  cancelSpeech();const version=++capture,detector=createVoiceActivity(),samples=new Float32Array(analyser.fftSize),started=performance.now();
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  const current=new MediaRecorder(stream,mime?{mimeType:mime}:{});recorder=current;parts=[];let first=null;
  current.ondataavailable=e=>{if(e.data.size&&version===capture)parts.push(e.data);};
  current.onerror=()=>{if(version===capture){close();onError(Error('Micro vừa bị gián đoạn. Bạn bấm Tiếp tục để thử lại nhé.'));}};
  current.onstop=async()=>{
   clearInterval(poll);clearTimeout(idle);const blob=new Blob(parts,{type:current.mimeType});parts=[];if(!current._send||disposed||version!==capture)return;
   onState('preparing');
   try{const wav=await chatWav(blob,{from:first===null?0:Math.max(0,(first-started-300)/1000)});if(version===capture&&!disposed)onTurn(wav);}
   catch(e){if(version===capture&&!disposed)onError(e);}
  };
  current.start();onState('listening');
  poll=setInterval(()=>{
   if(disposed||version!==capture||!analyser)return;
   analyser.getFloatTimeDomainData(samples);let sum=0;for(const v of samples)sum+=v*v;
   const now=performance.now(),activity=detector.sample(Math.sqrt(sum/samples.length),now);
   if(activity.speaking){first=activity.first;onState('listening',Math.min(20,Math.floor((now-first)/1000)));}
   if(activity.done||activity.limit)stopCapture(true);
  },50);
  idle=setTimeout(()=>{if(first===null&&version===capture){close();onIdle('Mình đang chờ bạn. Bấm Tiếp tục khi sẵn sàng nói nhé.');}},25000);
  return true;
 }
 function say(text,{slow=false}={}){
  stopCapture(false);cancelSpeech();const voice=voices().find(v=>/zh[-_]CN/i.test(v.lang))||voices()[0];
  if(!voice||!synth||!window.SpeechSynthesisUtterance)return Promise.resolve(false);
  const generation=speechGeneration;
  return new Promise(resolve=>{
   speechResolve=resolve;utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=slow?.65:.9;
   const done=ok=>{if(generation!==speechGeneration)return;clearTimeout(speechTimer);speechResolve=null;utterance=null;resolve(ok);};
   utterance.onend=()=>done(true);utterance.onerror=()=>done(false);speechTimer=setTimeout(()=>{cancelSpeech();},30000);synth.speak(utterance);
  });
 }
 function pause(){close();cancelSpeech();}
 function dispose(){disposed=true;pause();}
 return {open,listen,say,finishTurn:()=>stopCapture(true),pause,dispose};
}
