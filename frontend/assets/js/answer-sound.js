let context;

function soundEnabled(){return document.documentElement.dataset.studentEffects!=='off';}
function getContext(){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)return null;
 try{context ||= new AudioContextClass();return context;}catch{return null;}
}

export function prepareAnswerSound(){
 if(!soundEnabled())return;
 const audio=getContext();
 if(audio?.state==='suspended')audio.resume().catch(()=>{});
}

export function playAnswerSound(correct){
 if(!soundEnabled())return;
 const audio=getContext();if(!audio)return;
 if(audio.state==='suspended'){audio.resume().then(()=>playAnswerSound(correct)).catch(()=>{});return;}
 const now=audio.currentTime,notes=correct?[{hz:660,at:0},{hz:880,at:.11}]:[{hz:260,at:0},{hz:190,at:.12}];
 for(const note of notes){
  const oscillator=audio.createOscillator(),gain=audio.createGain(),start=now+note.at,end=start+.095;
  oscillator.type='sine';oscillator.frequency.setValueAtTime(note.hz,start);
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(.045,start+.012);gain.gain.setValueAtTime(.045,end-.018);gain.gain.linearRampToValueAtTime(.0001,end);
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(end);
 }
}
