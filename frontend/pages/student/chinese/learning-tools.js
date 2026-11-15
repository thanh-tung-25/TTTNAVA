import {el,card,button} from '/assets/js/chinese-common.js';
import {studyReward} from '/assets/js/study-reward.js';

export function writing(setId){
 const canvas=el('canvas',{width:440,height:260,'aria-label':'Vùng tự luyện viết chữ'}),ctx=canvas.getContext('2d'),reward=studyReward({activity:'writing',sourceId:setId,required:3});let drawing=false,path=[],strokes=[];
 const complete=button('Hoàn thành lượt viết',()=>{reward.evidence({strokes});reward.finish();});complete.disabled=true;
 const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
 canvas.onpointerdown=e=>{reward.begin();canvas.setPointerCapture(e.pointerId);drawing=true;path=[point(e)];ctx.beginPath();ctx.moveTo(path[0][0]*canvas.width,path[0][1]*canvas.height);};
 canvas.onpointermove=e=>{if(!drawing)return;const p=point(e);if(path.length<200)path.push(p);ctx.lineWidth=4;ctx.lineCap='round';ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height);ctx.stroke();};
 canvas.onpointerup=()=>{if(drawing&&path.length>=2&&strokes.length<50)strokes.push(path);drawing=false;complete.disabled=strokes.length<3;};canvas.onpointercancel=()=>{drawing=false;};
 return card('Tự luyện viết',[el('p',{text:'Tập viết ít nhất 3 nét để hoàn thành một lượt. Đây là thưởng luyện tập, không chấm đúng nét chữ.'}),canvas,el('div',{class:'learn-actions'},[button('Xóa bảng',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);strokes=[];complete.disabled=true;}),complete]),reward.node]);
}
export function recording(setId){
 const box=card('Luyện đọc theo mẫu',[el('p',{text:'Nghe mẫu trên thẻ rồi đọc theo ít nhất 5 giây. Bản ghi chỉ ở trên thiết bị của bạn.'})]);
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){box.append(el('p',{text:'Thiết bị chưa hỗ trợ ghi âm. Hãy dùng trình duyệt hỗ trợ microphone qua localhost hoặc HTTPS.'}));return box;}
 let recorder,stream,url,timer,started,reward;const rewardArea=el('div');
 const stop=button('Dừng ghi',()=>recorder?.stop());stop.disabled=true;
 const start=button('Ghi âm (cho phép microphone)',async()=>{
  reward=studyReward({activity:'recording',sourceId:setId,required:5});reward.begin();stream=await navigator.mediaDevices.getUserMedia({audio:true});
  try{const chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>{
   const duration=(performance.now()-started)/1000;clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));box.querySelector('audio')?.remove();box.append(el('audio',{src:url,controls:true,class:'recording'}));
   const complete=button('Hoàn thành lượt đọc',()=>{reward.evidence({duration:Math.min(120,duration)});reward.finish();});complete.disabled=duration<5;rewardArea.replaceChildren(reward.node,complete);start.disabled=false;stop.disabled=true;
  };started=performance.now();recorder.start();start.disabled=true;stop.disabled=false;timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},60000);
  }catch(e){stream.getTracks().forEach(t=>t.stop());throw e;}
 });
 window.addEventListener('pagehide',()=>{stream?.getTracks().forEach(t=>t.stop());if(url)URL.revokeObjectURL(url);});box.append(start,stop,rewardArea);return box;
}
