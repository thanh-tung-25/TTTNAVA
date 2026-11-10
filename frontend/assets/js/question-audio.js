// Shared opt-in reading. Only explicit prompt text is passed in, never answer DOM.
let active=null,sequence=0;
const vietnamese=/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu;
export function speechParts(text,language='vi-VN'){
 const plain=String(text||'').replace(/_{2,}|\.{3,}|…/gu,language.startsWith('en')?' blank ':' chỗ trống ');
 return (plain.match(/\p{Script=Han}+[，。！？、：；“”‘’]*|[^\p{Script=Han}]+/gu)||[]).flatMap(part=>{
  if(!part.trim())return [];
  const lang=/\p{Script=Han}/u.test(part)?'zh-CN':vietnamese.test(part)?'vi-VN':language;
  const spoken=lang==='vi-VN'?part.replace(/[×*]/g,' nhân ').replace(/÷/g,' chia ').replace(/\+/g,' cộng ').replace(/(?<=\d)\s*[-−]\s*(?=\d)/g,' trừ ').replace(/=/g,' bằng ').replace(/</g,' bé hơn ').replace(/>/g,' lớn hơn '):part;
  // Keep utterances short enough for browser speech engines.
  return (spoken.match(/[\s\S]{1,180}/gu)||[]).filter(text=>text.trim()).map(text=>({text,lang}));
 });
}
export function stopQuestionAudio(){
 sequence++;
 if(active){const old=active;active=null;old.abort?.abort();if(old.audio){old.audio.pause();old.audio.removeAttribute('src');old.audio.load?.();old.audio.remove();}if(old.url)URL.revokeObjectURL(old.url);old.button.textContent=old.label;old.button.setAttribute('aria-label',old.ariaLabel);old.button.setAttribute('aria-pressed','false');old.status.textContent='';window.speechSynthesis?.cancel();}
}
export function questionAudio(text,{language='vi-VN',label='🔊 Nghe câu hỏi',compact=false}={}){
 const wrap=document.createElement('div');wrap.className='question-audio';
 const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent=compact?'🔊':label;button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed','false');
 if(compact)wrap.classList.add('choice-audio');
 const status=document.createElement('span');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 wrap.append(button,status);
 button.onclick=()=>{
  if(active?.button===button){stopQuestionAudio();return;}
  stopQuestionAudio();
  const parts=speechParts(typeof text==='function'?text():text,language);if(!parts.length){status.textContent='Câu này chưa có nội dung chữ để đọc.';return;}
  const synth=window.speechSynthesis,voices=synth?.getVoices()||[];
  const token=sequence;active={button,status,wrap,label:compact?'🔊':label,ariaLabel:label};button.textContent=compact?'⏹':'⏹ Dừng đọc';button.setAttribute('aria-label',compact?'Dừng đọc lựa chọn':'Dừng đọc');button.setAttribute('aria-pressed','true');status.textContent='Đang đọc…';
  let index=0;
  const speak=()=>{
   if(token!==sequence||!wrap.isConnected)return;
   if(index===parts.length){stopQuestionAudio();return;}
   const part=parts[index++];
   const voice=voices.find(v=>v.lang.toLowerCase()===part.lang.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(part.lang.slice(0,2)));
   if(!voice||!window.SpeechSynthesisUtterance){playOnline(part);return;}
   const utterance=new SpeechSynthesisUtterance(part.text);utterance.lang=part.lang;utterance.rate=Math.max(.5,Math.min(1.5,Number(window.ttnavaSpeechRate)||.8));utterance.pitch=1;utterance.voice=voice;
   utterance.onend=speak;utterance.onerror=()=>{if(token===sequence)playOnline(part);};
   // Retain the utterance while it is being spoken (some engines need this).
   active.utterance=utterance;synth.speak(utterance);
  };
  const playOnline=async part=>{
   if(token!==sequence)return;
   const controller=new AbortController();active.abort=controller;status.textContent='Đang tải giọng đọc…';
   try{
    const result=await fetch('/api/v1/question-audio',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:part.text,lang:part.lang}),signal:controller.signal});
    if(!result.ok)throw Error('audio');
    const blob=await result.blob();if(token!==sequence)return;
    const url=URL.createObjectURL(blob),audio=new Audio(url);active.url=url;active.audio=audio;audio.playbackRate=Math.max(.5,Math.min(1.5,Number(window.ttnavaSpeechRate)||.85));
    audio.onended=()=>{if(token!==sequence)return;audio.remove();URL.revokeObjectURL(url);active.url=null;active.audio=null;speak();};
    audio.onerror=()=>{if(token===sequence){stopQuestionAudio();status.textContent='Chưa phát được âm thanh. Con bấm nghe lại nhé.';}};
    try{await audio.play();if(token===sequence)status.textContent='Đang đọc…';}
    catch(e){if(token!==sequence)return;if(e.name!=='NotAllowedError')throw e;audio.controls=true;wrap.append(audio);status.textContent='Âm thanh đã sẵn sàng. Bấm nút phát bên dưới để nghe.';}
   }catch(e){if(token!==sequence||e.name==='AbortError')return;stopQuestionAudio();status.textContent='Chưa tải được giọng đọc. Con kiểm tra mạng rồi bấm nghe lại nhé.';}
  };speak();
 };
 return wrap;
}
export function withChoiceAudio(choice,text,index,options={}){
 const row=document.createElement('div');row.className='choice-with-audio';
 const audio=questionAudio(text,{...options,label:'Nghe lựa chọn '+index,compact:true});
 audio.addEventListener('click',e=>e.stopPropagation());row.append(choice,audio);return row;
}
export function attachQuestionAudio(prompt,text=prompt?.textContent,options){
 if(!prompt)return;
 const old=prompt.nextElementSibling;
 if(old?.classList.contains('question-audio')){if(active?.wrap===old)stopQuestionAudio();old.remove();}
 prompt.after(questionAudio(text,options));
}
if(typeof window!=='undefined'){
 window.addEventListener('pagehide',stopQuestionAudio);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopQuestionAudio();});
 new MutationObserver(()=>{if(active&&(!active.wrap.isConnected||!active.wrap.getClientRects().length))stopQuestionAudio();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
}
