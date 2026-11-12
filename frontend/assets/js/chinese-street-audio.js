export function createStreetVoice(onStatus){
 const synth=window.speechSynthesis;let utterance,disposed=false;
 const voices=()=>synth?.getVoices().filter(v=>/^zh(?:-|_|$)/i.test(v.lang))||[];
 function stop(){synth?.cancel();utterance=null;}
 function play(text,slow=false){
  stop();const voice=voices().find(v=>/^zh[-_]CN$/i.test(v.lang))||voices()[0];
  if(!voice||!window.SpeechSynthesisUtterance){onStatus('Máy chưa có giọng đọc tiếng Trung. Con có thể bấm “Hiện chữ” để tiếp tục.');return false;}
  if(disposed)return false;
  utterance=new SpeechSynthesisUtterance(text);utterance.lang=voice.lang;utterance.voice=voice;utterance.rate=slow?.6:.85;
  utterance.onend=()=>{if(!disposed)onStatus('Đã nghe xong. Đến lượt con!');utterance=null;};
  utterance.onerror=e=>{if(!disposed&&!['canceled','interrupted'].includes(e.error))onStatus('Chưa phát được tiếng. Con thử nghe lại hoặc mở chữ nhé.');};
  synth.speak(utterance);onStatus(slow?'Đang đọc chậm…':'Đang đọc…');return true;
 }
 const hidden=()=>{if(document.hidden)stop();};
 function dispose(){disposed=true;stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',dispose);}
 document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',dispose);
 // Calling this early lets browsers load their installed voices before a click.
 voices();return {play,stop,dispose};
}
