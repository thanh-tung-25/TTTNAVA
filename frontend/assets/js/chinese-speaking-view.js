import {el,button} from './chinese-common.js';

export function speakingView(host,{profile,set,count}){
 const shell=el('section',{class:'speaking-studio','data-phase':'idle','aria-label':'Luyện nói và tải video'});
 const counter=el('span',{class:'speaking-counter',text:`Câu 1 / ${count}`}),heading=el('h3',{text:'Đến lượt bạn nói'});
 const state=el('span',{class:'speaking-state',text:'Sẵn sàng luyện tập'}),clock=el('strong',{class:'speaking-clock',text:'00:00 / 00:30'});
 const status=el('p',{class:'speaking-status',role:'status','aria-live':'polite',text:'Bật camera và microphone để bắt đầu.'});
 const camera=button('Bật camera & micro',()=>{}),record=button('Bắt đầu quay',()=>{}),stop=button('Dừng quay',()=>{}),listen=button('Nghe lại câu hỏi',()=>{}),next=button('Câu tiếp theo →',()=>{});
 camera.classList.add('speaking-camera-toggle');record.classList.add('btn-primary');stop.classList.add('speaking-stop');stop.hidden=true;record.disabled=listen.disabled=next.disabled=true;
 const listenCount=el('p',{class:'speaking-listen-count',text:'Bắt đầu quay để nghe câu hỏi.'});
 const live=el('video',{class:'speaking-live',autoplay:true,muted:true,playsinline:true,'aria-label':'Xem trước camera của bạn'});live.muted=true;
 const placeholder=el('div',{class:'speaking-placeholder'},[el('span',{class:'speaking-camera-icon','aria-hidden':'true',text:'◉'}),el('strong',{text:'Một câu nói, thêm tự tin'}),el('p',{text:'Hình ảnh của bạn sẽ xuất hiện ở đây.'})]);
 const progress=el('progress',{class:'speaking-progress',max:30,value:0,'aria-label':'Thời gian video'});
 const resultVideo=el('video',{controls:true,playsinline:true,preload:'metadata','aria-label':'Video đã quay có câu hỏi'});
 const download=el('a',{class:'btn btn-primary speaking-download',text:'↓ Tải video về máy'}),resultInfo=el('p',{class:'speaking-result-info'}),resultQuestion=el('p',{class:'speaking-result-question',lang:'zh-CN'});
 const result=el('section',{class:'speaking-result card',hidden:true,'aria-label':'Bản ghi để nộp qua Zalo'},[
  el('div',{class:'speaking-result-head'},[el('div',{},[el('span',{class:'speaking-eyebrow',text:'BẢN GHI CỦA BẠN'}),el('h3',{text:'Tải về, rồi gửi bài qua Zalo'})]),el('span',{class:'speaking-badge',text:'Lưu trên thiết bị'})]),
  resultVideo,resultQuestion,resultInfo,el('div',{class:'speaking-result-actions'},[download,next]),el('p',{class:'speaking-note',text:'Tải video trước khi rời trang. Sau đó mở Zalo và gửi tệp cho giáo viên.'})
 ]);
 shell.append(el('header',{class:'speaking-hero'},[
  el('div',{},[el('span',{class:'speaking-eyebrow',text:'GÓC LUYỆN PHẢN XẠ'}),el('h2',{text:'Nghe một câu, nói thật tự tin!'}),el('p',{text:'Quay ngay trên web · Tải video về máy · Nộp bài qua Zalo'})]),el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:94,height:104})
 ]),el('ol',{class:'speaking-steps'},['Bật camera & micro','Nghe và trả lời','Tải video về máy'].map((text,n)=>el('li',{},[el('span',{text:String(n+1)}),el('strong',{text})]))),
 el('div',{class:'speaking-grid'},[
  el('section',{class:'speaking-listen card'},[
   el('div',{class:'speaking-card-head'},[el('span',{class:'speaking-eyebrow',text:`HSK ${set.level_id} · LUYỆN NÓI`}),counter]),heading,
   el('div',{class:'speaking-panda','aria-hidden':'true'},[el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:140,height:154}),el('div',{class:'speaking-waves'},Array.from({length:7},()=>el('i')))]),
   el('span',{class:'speaking-badge',text:'Ẩn chữ khi trả lời'}),el('p',{class:'speaking-lock-note',text:'Câu hỏi được ghép vào video tải về. Khi quay, bạn chỉ nghe và trả lời.'}),listen,listenCount
  ]),
  el('section',{class:'speaking-camera card'},[
   el('div',{class:'speaking-card-head'},[el('h3',{text:'Khung hình của bạn'}),state]),el('div',{class:'speaking-preview'},[live,placeholder]),
   el('div',{class:'speaking-timing'},[el('span',{text:'Mỗi video tối đa 30 giây'}),clock]),progress,
   el('div',{class:'speaking-controls'},[camera,record,stop]),status
  ])
 ]),el('div',{class:'speaking-footer'},[el('span',{text:'● Video được tạo trên thiết bị, không tải lên server.'}),el('span',{text:profile.displayName||profile.display_name||profile.username||'Học sinh'})]),result);
 host.append(shell);
 return {shell,counter,heading,state,clock,status,camera,record,stop,listen,next,listenCount,live,placeholder,progress,result,resultVideo,download,resultInfo,resultQuestion};
}
