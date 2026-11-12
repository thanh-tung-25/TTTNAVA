export function speakingSupported(){
 return Boolean(window.isSecureContext&&navigator.mediaDevices?.getUserMedia&&window.MediaRecorder&&(window.AudioContext||window.webkitAudioContext));
}

export function createSpeakingMedia(level,{onRecorded,onFailure}){
 let input,context,microphone,analyser,source,recorder,frame=0,disposed=false,opening=0,buffers=new Map();
 function stopQuestion(){if(source){const old=source;source=null;try{old.stop();}catch{}old.disconnect();}}
 function stop(){stopQuestion();if(recorder?.state==='recording')recorder.stop();}
 function close(){
  opening++;stop();const stream=input;input=null;stream?.getTracks().forEach(track=>track.stop());
  cancelAnimationFrame(frame);level.value=0;microphone?.disconnect();microphone=null;analyser=null;buffers.clear();
  const previous=context;context=null;previous?.close().catch(()=>{});
 }
 async function open(){
  const token=++opening;
  const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  if(disposed||token!==opening){acquired.getTracks().forEach(track=>track.stop());return false;}
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;context=new Audio();input=acquired;
   microphone=context.createMediaStreamSource(input);analyser=context.createAnalyser();analyser.fftSize=256;microphone.connect(analyser);
   const values=new Float32Array(analyser.fftSize),meter=()=>{
    if(disposed||!analyser)return;analyser.getFloatTimeDomainData(values);
    level.value=Math.min(1,Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length)*5);frame=requestAnimationFrame(meter);
   };meter();
   for(const track of input.getTracks())track.addEventListener('ended',()=>{if(!disposed&&input===acquired){onFailure(Error('Micro vừa bị ngắt. Hãy bật lại micro để tiếp tục.'));close();}},{once:true});
   return true;
  }catch(error){acquired.getTracks().forEach(track=>track.stop());close();throw error;}
 }
 async function prepare(questions,signal){
  const audio=context;if(!audio)throw Error('Hãy bật micro trước.');await audio.resume();
  const request=new AbortController(),cancel=()=>request.abort();signal.addEventListener('abort',cancel,{once:true});
  if(signal.aborted)request.abort();const timeout=setTimeout(cancel,30000);
  try{
   const pending=[...new Set(questions.map(question=>question.text))],prepared=new Map();let next=0;
   const worker=async()=>{while(next<pending.length){
    const text=pending[next++];if(request.signal.aborted)throw new DOMException('Aborted','AbortError');
    const response=await fetch('/api/v1/question-audio',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang:'zh-CN'}),signal:request.signal});
    if(!response.ok)throw Error('Chưa tải được giọng đọc câu hỏi. Hãy kiểm tra mạng rồi thử ghi âm lại.');
    let decoded;try{decoded=await audio.decodeAudioData(await response.arrayBuffer());}catch{throw Error('Chưa đọc được âm thanh câu hỏi. Hãy thử ghi âm lại.');}
    if(request.signal.aborted||disposed||audio!==context)throw new DOMException('Aborted','AbortError');prepared.set(text,decoded);
   }};
   await Promise.all(Array.from({length:Math.min(3,pending.length)},worker));buffers=prepared;
  }catch(error){const timedOut=request.signal.aborted&&!signal.aborted;request.abort();if(timedOut)throw Error('Tải giọng đọc quá lâu. Hãy kiểm tra mạng rồi thử lại.');throw error;}
  finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);}
 }
 function playQuestion(text){
  const buffer=buffers.get(text);if(!buffer||!context)return Promise.reject(Error('Giọng đọc chưa sẵn sàng.'));
  stopQuestion();return new Promise(resolve=>{
   const current=context.createBufferSource();source=current;current.buffer=buffer;current.playbackRate.value=.85;
   // Read the question to the learner; the recorder receives microphone tracks only.
   current.connect(context.destination);current.onended=()=>{if(source===current)source=null;current.disconnect();resolve();};current.start();
  });
 }
 function record(meta){
  if(!input?.active||!context||disposed)throw Error('Micro chưa sẵn sàng. Hãy bật lại micro.');
  const types=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].filter(type=>MediaRecorder.isTypeSupported(type));
  if(!types.length)throw Error('Trình duyệt chưa hỗ trợ ghi âm. Hãy thử Chrome hoặc Safari mới.');
  let last;
  for(const mimeType of types){
   try{
    const current=new MediaRecorder(new MediaStream(input.getAudioTracks()),{mimeType,audioBitsPerSecond:64000}),pieces=[];
    current.ondataavailable=event=>{if(event.data.size)pieces.push(event.data);};
    current.onstop=()=>{stopQuestion();const blob=new Blob(pieces,{type:current.mimeType});pieces.length=0;if(!disposed)onRecorded(blob,meta);};
    current.onerror=()=>{if(!disposed)onFailure(Error('Ghi âm bị gián đoạn. Hãy thử ghi âm lại.'));stop();};
    current.start(250);recorder=current;return;
   }catch(error){last=error;}
  }
  throw last;
 }
 return {open,close,prepare,record,playQuestion,stop,stopQuestion,get ready(){return Boolean(input?.active&&context);},dispose(){disposed=true;close();}};
}
