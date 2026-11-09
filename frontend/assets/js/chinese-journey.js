import {el,request} from './chinese-common.js';

const companions=[
 {name:'Gấu trúc',place:'Rừng trúc xanh',image:'/assets/images/mascot-panda.svg',color:'#278b70',soft:'#e5f5ec'},
 {name:'Thỏ ngọc',place:'Vườn hoa nắng',image:'/assets/images/mascot-bunny.svg',color:'#c16d40',soft:'#fff0df'},
 {name:'Cú thông thái',place:'Đồi sao tím',image:'/assets/images/mascot-owl.svg',color:'#8962bf',soft:'#f0e9fb'},
 {name:'Mèo nhỏ',place:'Đồng cỏ dịu êm',image:'/assets/avatars/meo.svg',color:'#bd7930',soft:'#fff4d9'},
 {name:'Cáo lanh lợi',place:'Thung lũng hồng',image:'/assets/avatars/cao.svg',color:'#bb6083',soft:'#fbe9ef'},
 {name:'Voi tốt bụng',place:'Suối mây trong',image:'/assets/avatars/voi.svg',color:'#548ca8',soft:'#e6f3fa'}
];
const symbol=(type)=>el('span',{class:'journey-symbol','aria-hidden':'true',html:type==='lock'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="11" rx="4"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>'});

export async function chooseQuiz(setId,start,review=false){
 const plan=await request('/sets/'+setId+'/quiz-plan');
 if(!document.querySelector('link[data-journey-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/chinese-journey.css','data-journey-style':'true'}));
 const dialog=el('dialog',{class:'feedback-dialog journey-dialog','aria-label':'Chọn nội dung quiz'});
 let mode=review?'review':'sequential';
 const first=plan.blocks.find(b=>!b.completed&&b.unlocked!==false)||plan.blocks[0];
 let selected=plan.blocks.find(b=>b.block===plan.active?.block)||first;
 const done=plan.blocks.filter(b=>b.completed).length;
 const status=el('p',{class:'journey-status',role:'status','aria-live':'polite'}),map=el('div',{class:'journey-map','aria-label':'Bản đồ các con vật'}),detail=el('aside',{class:'journey-detail','aria-label':'Chặng đã chọn'}),buttons=[];
 const close=el('button',{type:'button',class:'journey-close',text:'×','aria-label':'Đóng bản đồ',onclick:()=>dialog.close()});
 const pathButton=el('button',{type:'button',text:'Khám phá cùng bạn nhỏ',onclick:()=>{mode='sequential';renderDetail();}}),reviewButton=el('button',{type:'button',text:'Ôn điều đã học',onclick:()=>{mode='review';renderDetail();}});
 const go=el('button',{type:'button',class:'btn btn-primary journey-go','aria-label':'Bắt đầu / tiếp tục 20 câu',onclick:async()=>{
  go.disabled=true;status.textContent='Đang chuẩn bị chặng học…';
  try{await start({set_id:setId,count:20,selection:mode,block:selected?.block||0});dialog.close();}
  catch(e){status.textContent=e.message;go.disabled=false;}
 }});
 const heading=el('header',{class:'journey-header'},[
  el('div',{class:'journey-header-copy'},[el('span',{class:'journey-eyebrow',text:'HÀNH TRÌNH TIẾNG TRUNG'}),el('h2',{text:'Cùng bạn nhỏ khám phá'}),el('p',{text:'Mỗi con vật là một người bạn. Đi từng chặng, học từng chút nhé!'})]),close,
  el('div',{class:'journey-overview'},[el('span',{text:done+'/'+plan.blocks.length+' chặng hoàn thành'}),el('progress',{max:Math.max(1,plan.blocks.length),value:done,'aria-label':'Tiến độ hành trình'})])
 ]);
 const tabs=el('nav',{class:'journey-tabs','aria-label':'Cách luyện'},[pathButton,reviewButton]);
 for(let group=0;group<Math.ceil(plan.blocks.length/4);group++){
  const friend=companions[group%companions.length],stages=plan.blocks.slice(group*4,group*4+4),finished=stages.every(b=>b.completed),open=stages.some(b=>b.unlocked!==false);
  const island=el('section',{class:'journey-island'+(finished?' is-finished':'')+(!open?' is-sleeping':''),'aria-label':friend.name+' · Khu '+(group+1)});
  island.style.setProperty('--journey-color',friend.color);island.style.setProperty('--journey-soft',friend.soft);
  island.append(el('div',{class:'journey-island-head'},[
   el('div',{class:'journey-mascot'},[el('img',{src:friend.image,alt:friend.name,width:112,height:112,draggable:false})]),
   el('div',{},[el('span',{class:'journey-island-number',text:'BẠN ĐỒNG HÀNH '+(group+1)}),el('h3',{text:friend.place}),el('p',{text:'Cùng '+friend.name+' · '+stages.length+' chặng nhỏ'})]),
   ...(finished?[el('span',{class:'journey-complete-badge',text:'✓ Hoàn thành'})]:[])
  ]));
  const trail=el('div',{class:'journey-stages'});
  for(const b of stages){
   const locked=b.unlocked===false&&!b.completed,label=b.completed?'Đã hoàn thành':locked?'Chưa mở':'Sẵn sàng khám phá';
   const circle=el('span',{class:'journey-stage-circle'},[b.completed?symbol('done'):locked?symbol('lock'):el('span',{text:String(b.block+1)})]);
   const button=el('button',{type:'button',class:'journey-stage'+(b.completed?' is-done':'')+(locked?' is-locked':''),'aria-label':'Chặng '+(b.block+1)+' · '+label,onclick:()=>{selected=b;mode='sequential';renderDetail();}});
   button.disabled=locked;button.append(circle,el('strong',{text:'Chặng '+(b.block+1)}),el('small',{text:b.completed&&b.score!=null?b.score+'/100':locked?'Chờ bạn tới':'20 câu'}));
   buttons.push({button,block:b.block});trail.append(button);
  }
  island.append(trail);map.append(island);
 }
 if(!plan.blocks.length)map.append(el('p',{class:'journey-empty',text:'Bài này chưa đủ 20 câu. Mình học thẻ từ trước nhé!'}));
 function renderDetail(){
  pathButton.setAttribute('aria-pressed',String(mode==='sequential'));reviewButton.setAttribute('aria-pressed',String(mode==='review'));
  for(const item of buttons)item.button.setAttribute('aria-current',String(mode==='sequential'&&item.block===selected?.block));
  const friend=companions[Math.floor((selected?.block||0)/4)%companions.length];
  status.textContent='';detail.replaceChildren();
  if(mode==='review'){
   detail.append(el('img',{class:'journey-detail-mascot',src:'/assets/images/mascot-owl.svg',alt:'Cú thông thái',width:100,height:100}),el('span',{class:'journey-eyebrow',text:'NHỚ THÊM MỘT CHÚT'}),el('h3',{text:'Đi lại những dấu chân cũ'}),el('p',{text:'Con đã làm '+plan.review_count+' câu. Lượt ôn chỉ dùng những câu này, ưu tiên câu từng sai.'}));
   if(plan.review_count<20)detail.append(el('p',{class:'journey-tip',text:'Hãy khám phá đủ 20 câu trước nhé. Không thêm câu lạ vào lượt ôn của con.'}));
   go.disabled=plan.review_count<20;go.textContent='Cùng cú ôn lại →';
  }else if(selected){
   detail.append(el('img',{class:'journey-detail-mascot',src:friend.image,alt:'',width:100,height:100}),el('span',{class:'journey-eyebrow',text:selected.completed?'MÌNH CÙNG LUYỆN LẠI':'CHẶNG HỌC CỦA CON'}),el('h3',{text:'Cùng '+friend.name+' · Chặng '+(selected.block+1)}),el('p',{text:selected.completed?'Con đã đi qua chặng này. Thử lại để nhớ chắc hơn nhé!':'20 câu nhỏ đang chờ. Hoàn thành để mở chặng tiếp theo.'}));
   const preview=el('details',{class:'journey-preview'},[el('summary',{text:'Nhìn trước 20 câu'}),el('p',{class:'journey-source',text:'Nội dung câu '+selected.from+'–'+selected.to+' trong bài. Chặng cuối có thể ôn lại một số câu của chặng trước.'}),...selected.questions.map((q,n)=>el('p',{text:(n+1)+'. '+q.data.prompt}))]);detail.append(preview);
   go.disabled=selected.unlocked===false&&!selected.completed;go.textContent=plan.active?'Tiếp tục chặng đang học →':selected.completed?'Khám phá lại chặng này →':'Bắt đầu khám phá →';
  }else{go.disabled=true;detail.append(el('h3',{text:'Cùng học từ trước nhé'}));}
  if(plan.active)detail.append(el('p',{class:'journey-tip',text:plan.active.block!=null?'Con đang có lượt ở chặng '+(plan.active.block+1)+'. Mình hoàn thành lượt đó trước nhé.':'Con đang có một lượt quiz. Mình tiếp tục lượt đó trước nhé.'}));
  detail.append(el('a',{class:'journey-words',text:'▤ Học từ mới của bài',href:'?set='+setId+'&mode=words'}),el('small',{class:'journey-footnote',text:'Tiến độ lưu theo tài khoản. Chạm vào chặng đã hoàn thành để luyện lại.'}));
 }
 dialog.append(heading,tabs,el('div',{class:'journey-body'},[map,detail]),el('footer',{class:'journey-footer'},[status,go]));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());renderDetail();dialog.showModal();
 const selectedButton=buttons.find(b=>b.block===selected?.block)?.button;
 if(selectedButton)requestAnimationFrame(()=>{map.scrollTop=Math.max(0,selectedButton.closest('.journey-island').offsetTop-map.offsetTop-12);});
}
