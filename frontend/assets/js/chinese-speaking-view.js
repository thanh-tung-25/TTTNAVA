import {el,button} from './chinese-common.js';
import {speakingTime} from './chinese-speaking-data.js';

export function speakingView(host,{profile,set,count,settings}){
 const shell=el('section',{class:'speaking-studio','data-phase':'idle','aria-label':'Luyện nói và tải video'});
 const counter=el('span',{class:'speaking-counter',text:`Đã nghe 0 / ${count} câu`}),heading=el('h3',{text:'Một video, nhiều câu trả lời'});
 const state=el('span',{class:'speaking-state',text:'Sẵn sàng luyện tập'}),clock=el('strong',{class:'speaking-clock',text:'Còn '+speakingTime(settings.duration_seconds)});
 const status=el('p',{class:'speaking-status',role:'status','aria-live':'polite',text:'Bật camera và microphone để bắt đầu.'});
 const camera=button('Bật camera & micro',()=>{}),record=button('Bắt đầu quay',()=>{}),stop=button('Dừng quay',()=>{}),retake=button('Quay lại video',()=>{});
 camera.classList.add('speaking-camera-toggle');record.classList.add('btn-primary');stop.classList.add('speaking-stop');stop.hidden=true;record.disabled=true;retake.classList.add('speaking-retake');
 const questions=el('div',{class:'speaking-question-buttons','aria-label':'Nghe từng câu hỏi'}),questionButtons=[];
 for(let index=0;index<count;index++){
  const b=button('',()=>{}),label=el('strong',{text:'🔊 Nghe câu '+(index+1)}),detail=el('small',{text:'Chưa nghe · 0/2'});b.append(label,detail);b.disabled=true;b.classList.add('speaking-question-button');b.dataset.question=String(index+1);questions.append(b);questionButtons.push({button:b,detail});
 }
 const listenCount=el('p',{class:'speaking-listen-count',text:'Mỗi câu nghe tối đa 2 lần.'});
 const live=el('video',{class:'speaking-live',autoplay:true,muted:true,playsinline:true,'aria-label':'Xem trước camera của bạn'});live.muted=true;
 const placeholder=el('div',{class:'speaking-placeholder'},[el('span',{class:'speaking-camera-icon','aria-hidden':'true',text:'◉'}),el('strong',{text:'Sẵn sàng nghe và trả lời'}),el('p',{text:'Các câu trả lời của bạn sẽ nằm trong cùng một video.'})]);
 const progress=el('progress',{class:'speaking-progress',max:settings.duration_seconds,value:0,'aria-label':'Thời gian video'});
 const resultVideo=el('video',{controls:true,playsinline:true,preload:'metadata','aria-label':'Video đã quay có câu hỏi'});
 const download=el('a',{class:'btn btn-primary speaking-download',text:'↓ Tải video về máy'}),resultInfo=el('p',{class:'speaking-result-info'}),resultQuestion=el('p',{class:'speaking-result-question'}),timeline=el('ol',{class:'speaking-result-timeline'});
 const result=el('section',{class:'speaking-result card',hidden:true,'aria-label':'Bản ghi để nộp qua Zalo'},[
  el('div',{class:'speaking-result-head'},[el('div',{},[el('span',{class:'speaking-eyebrow',text:'BẢN GHI CỦA BẠN'}),el('h3',{text:'Xem lại, tải về và gửi qua Zalo'})]),el('span',{class:'speaking-badge',text:'Một video cho cả bài'})]),
  resultVideo,resultQuestion,timeline,resultInfo,el('div',{class:'speaking-result-actions'},[retake,download]),el('p',{class:'speaking-note',text:'Có thể quay lại toàn bộ bài. Tải video về máy trước khi rời trang rồi gửi tệp cho giáo viên qua Zalo.'})
 ]);
 shell.append(el('header',{class:'speaking-hero'},[
  el('div',{},[el('span',{class:'speaking-eyebrow',text:'NGHE & TRẢ LỜI TIẾNG TRUNG'}),el('h2',{text:'Nghe từng câu, trả lời trong một video'}),el('p',{text:`${count} câu hỏi · ${settings.duration_seconds} giây · Quay liên tục và tải về máy`})]),el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:94,height:104})
 ]),el('ol',{class:'speaking-steps'},['Bật camera & bắt đầu quay','Bấm nghe từng câu, trả lời','Xem lại & tải video'].map((text,n)=>el('li',{},[el('span',{text:String(n+1)}),el('strong',{text})]))),
 el('div',{class:'speaking-grid'},[
  el('section',{class:'speaking-listen card'},[
   el('div',{class:'speaking-card-head'},[el('span',{class:'speaking-eyebrow',text:`HSK ${set.level_id} · CÂU HỎI CÔ GIAO`}),counter]),heading,
   el('div',{class:'speaking-panda','aria-hidden':'true'},[el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:115,height:126}),el('div',{class:'speaking-waves'},Array.from({length:7},()=>el('i')))]),
   el('span',{class:'speaking-badge',text:settings.order==='free'?'Được chọn thứ tự nghe':'Nghe theo thứ tự cô giao'}),el('p',{class:'speaking-lock-note',text:'Bắt đầu quay rồi bấm nghe từng câu. Câu hỏi được ghép vào video tải về; bạn nghe và trả lời bằng tiếng Trung.'}),questions,listenCount
  ]),
  el('section',{class:'speaking-camera card'},[
   el('div',{class:'speaking-card-head'},[el('h3',{text:'Khung hình của bạn'}),state]),el('div',{class:'speaking-preview'},[live,placeholder]),
   el('div',{class:'speaking-timing'},[el('span',{text:`Một video tối đa ${settings.duration_seconds} giây`}),clock]),progress,
   el('div',{class:'speaking-controls'},[camera,record,stop]),status
  ])
 ]),el('div',{class:'speaking-footer'},[el('span',{text:'● Video được tạo trên thiết bị, không tải lên server.'}),el('span',{text:profile.displayName||profile.display_name||profile.username||'Học sinh'})]),result);
 host.append(shell);
 return {shell,counter,heading,state,clock,status,camera,record,stop,retake,questionButtons,listenCount,live,placeholder,progress,result,resultVideo,download,resultInfo,resultQuestion,timeline};
}
