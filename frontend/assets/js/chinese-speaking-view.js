import {el,button} from './chinese-common.js';
import {speakingTime} from './chinese-speaking-data.js';

export function speakingView(host,{profile,set,count,settings}){
 const shell=el('section',{class:'speaking-studio','data-phase':'idle','aria-label':'Ghi âm và chấm bài luyện nói'});
 const counter=el('span',{class:'speaking-counter',text:`Đã nghe 0 / ${count} câu`}),heading=el('h3',{text:'Nghe từng câu rồi trả lời'});
 const state=el('span',{class:'speaking-state',text:'Sẵn sàng luyện tập'}),clock=el('strong',{class:'speaking-clock',text:'Còn '+speakingTime(settings.duration_seconds)});
 const status=el('p',{class:'speaking-status',role:'status','aria-live':'polite',text:'Bật micro để bắt đầu.'});
 const microphone=button('Bật micro',()=>{}),record=button('Bắt đầu ghi âm',()=>{}),stop=button('Dừng ghi âm',()=>{}),retake=button('Ghi âm lại',()=>{});
 record.classList.add('btn-primary');stop.classList.add('speaking-stop');stop.hidden=true;record.disabled=true;
 const questions=el('div',{class:'speaking-question-buttons','aria-label':'Nghe từng câu hỏi'}),questionButtons=[];
 for(let index=0;index<count;index++){
  const control=button('',()=>{}),detail=el('small',{text:'Chưa nghe · 0/2'});control.append(el('strong',{text:'🔊 Nghe câu '+(index+1)}),detail);control.disabled=true;control.classList.add('speaking-question-button');control.dataset.question=String(index+1);questions.append(control);questionButtons.push({button:control,detail});
 }
 const listenCount=el('p',{class:'speaking-listen-count',text:'Mỗi câu nghe tối đa 2 lần.'}),level=el('meter',{min:0,max:1,value:0,'aria-label':'Mức âm thanh micro'});
 const progress=el('progress',{class:'speaking-progress',max:settings.duration_seconds,value:0,'aria-label':'Thời gian ghi âm'});
 const resultAudio=el('audio',{controls:true,preload:'metadata','aria-label':'Nghe lại bản ghi của bạn'}),download=el('a',{class:'btn speaking-download',text:'↓ Tải bản ghi'});
 const resultInfo=el('p',{class:'speaking-result-info'}),resultQuestion=el('p',{class:'speaking-result-question'}),timeline=el('ol',{class:'speaking-result-timeline'});
 const result=el('section',{class:'speaking-result card',hidden:true,'aria-label':'Bản ghi và kết quả luyện nói'},[
  el('div',{class:'speaking-result-head'},[el('div',{},[el('span',{class:'speaking-eyebrow',text:'BÀI NÓI CỦA BẠN'}),el('h3',{text:'Nghe lại và gửi AI chấm bài'})]),el('span',{class:'speaking-badge',text:'Một lượt, nhiều câu'})]),
  resultAudio,resultQuestion,timeline,resultInfo,el('div',{class:'speaking-result-actions'},[retake,download]),el('p',{class:'speaking-note',text:'Tải bản ghi là tùy chọn. Bản ghi chỉ giữ tạm trong trang này; rời trang mà chưa tải thì bản ghi sẽ mất.'})
 ]);
 shell.append(el('header',{class:'speaking-hero'},[
  el('div',{},[el('span',{class:'speaking-eyebrow',text:'NGHE · NÓI · TIẾN BỘ MỖI NGÀY'}),el('h2',{text:'Nghe câu hỏi, ghi âm trả lời'}),el('p',{text:`${count} câu hỏi · ${settings.duration_seconds} giây · Kết quả chấm được gửi cho cô`})]),el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:94,height:104})
 ]),el('ol',{class:'speaking-steps'},['Bật micro & ghi âm','Nghe câu hỏi, trả lời','Nghe lại & chấm AI'].map((text,index)=>el('li',{},[el('span',{text:String(index+1)}),el('strong',{text})]))),
 el('div',{class:'speaking-grid'},[
  el('section',{class:'speaking-listen card'},[
   el('div',{class:'speaking-card-head'},[el('span',{class:'speaking-eyebrow',text:`HSK ${set.level_id} · CÂU HỎI CÔ GIAO`}),counter]),heading,
   el('div',{class:'speaking-panda','aria-hidden':'true'},[el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:100,height:110})]),
   el('span',{class:'speaking-badge',text:settings.order==='free'?'Được chọn thứ tự nghe':'Nghe theo thứ tự cô giao'}),el('p',{class:'speaking-lock-note',text:'Bắt đầu ghi âm, bấm nghe từng câu rồi trả lời bằng tiếng Trung. Dùng tai nghe để giọng trả lời rõ hơn.'}),questions,listenCount
  ]),
  el('section',{class:'speaking-recorder card','aria-label':'Ghi âm câu trả lời'},[
   el('div',{class:'speaking-card-head'},[el('h3',{text:'Giọng nói của bạn'}),state]),
   el('div',{class:'speaking-microphone-visual','aria-hidden':'true'},[el('span',{text:'🎙'}),el('div',{class:'speaking-waves'},Array.from({length:7},()=>el('i')))]),
   el('label',{class:'speaking-level'},[el('span',{text:'Mức âm thanh micro'}),level]),
   el('div',{class:'speaking-timing'},[el('span',{text:`Một lượt tối đa ${settings.duration_seconds} giây`}),clock]),progress,
   el('div',{class:'speaking-controls'},[microphone,record,stop]),status
  ])
 ]),el('div',{class:'speaking-footer'},[el('span',{text:'Bản ghi chỉ gửi xử lý khi bạn bấm chấm AI.'}),el('span',{text:profile.displayName||profile.display_name||profile.username||'Học sinh'})]),result);
 host.append(shell);
 const grid=shell.querySelector('.speaking-grid'),workspace=shell.querySelector('.speaking-listen'),recorder=shell.querySelector('.speaking-recorder'),mobile=matchMedia('(max-width:680px)');
 const layout=()=>{if(mobile.matches)questions.before(recorder);else grid.append(recorder);};
 layout();mobile.addEventListener('change',layout);
 return {shell,workspace,counter,heading,state,clock,status,microphone,record,stop,retake,questionButtons,listenCount,level,progress,result,resultAudio,download,resultInfo,resultQuestion,timeline,disposeLayout:()=>mobile.removeEventListener('change',layout)};
}
