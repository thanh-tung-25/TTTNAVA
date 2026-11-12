import {el,link,request} from './chinese-common.js';
import {streetPlaces} from './chinese-street-places.js';
import {createStreetVoice} from './chinese-street-audio.js';
import {renderStreetEditor} from './chinese-street-editor.js';
const text=(value,className='')=>el('p',{class:className,text:value});
const button=(label,action,primary=false)=>el('button',{type:'button',class:'btn '+(primary?'btn-primary':'btn-secondary'),text:label,onclick:action});
const image=(place)=>el('img',{src:'/assets/images/chinese-street/'+place.id+'.svg',alt:'',width:180,height:160,loading:'lazy'});
export async function renderChineseStreet(host,{role='student',level=1}={}){
 if(!document.querySelector('link[data-street-style]'))document.head.append(el('link',{rel:'stylesheet',href:'/assets/css/chinese-street.css','data-street-style':''}));
 const admin=role==='admin',params=new URLSearchParams(location.search),app=el('div',{class:'street-app'}),alert=text('','street-alert'),status=text('','street-voice-status');
 alert.setAttribute('role','status');alert.setAttribute('aria-live','polite');status.setAttribute('role','status');
 let meta,data,index=0,heard=false,revealed=false,selected=null,result=null,pending=null,busy=false,loadVersion=0,disposed=false,complete=false;
 const voice=createStreetVoice(message=>{status.textContent=message;}),layout=el('div',{class:'street-layout'}),map=el('section',{class:'street-map','aria-label':'Bản đồ Phố tiếng Trung'}),station=el('section',{class:'street-station','aria-label':'Nhiệm vụ trong phố'}),stats=el('div',{class:'street-stats'});
 const hero=el('header',{class:'street-hero'},[el('div',{},[el('span',{class:'street-eyebrow',text:admin?'GÓC SOẠN & XEM THỬ':'MỖI GÓC PHỐ, MỘT CÂU CHUYỆN'}),el('h2',{text:'Dạo phố, học tiếng Trung'}),text(admin?'Chọn địa điểm, mở đúng bài rồi sửa ngay nhiệm vụ học sinh sẽ chơi.':'Ghé một nơi bạn thích. Nghe, khám phá và mang về những ngôi sao nhỏ.')]),el('img',{src:'/assets/images/mascot-lion.svg',width:100,height:110,alt:'Sư tử dẫn đường'})]);
 host.append(app);app.append(hero,stats,layout,alert);layout.append(map,station);app.append(el('footer',{class:'street-footer'},[link('← Về bài học',{level},role),text('Mỗi ngày ghé một nơi, học thêm một chút.','street-note')]));
 const showError=e=>{alert.textContent=e.message;};
 const mission=()=>complete?null:data?.missions[index];
 function reset(){voice.stop();heard=false;revealed=false;selected=null;result=null;pending=null;status.textContent='';alert.textContent='';}
 function renderStats(){const lessons=meta.lessons.filter(l=>admin||l.enabled),done=lessons.reduce((n,l)=>n+l.completed,0),total=lessons.reduce((n,l)=>n+l.total,0),stars=lessons.reduce((n,l)=>n+l.stars,0);stats.replaceChildren(el('span',{text:`HSK ${level}`}),el('span',{text:`${lessons.length} bài · ${total} nhiệm vụ`}),el('strong',{text:admin?'Xem thử như học sinh':`★ ${stars} sao · ${done}/${total} đã khám phá`}));}
 function renderMap(){
  const mapAnswer=mission()?.type==='map';map.classList.toggle('street-answer-map',Boolean(mapAnswer));map.replaceChildren(el('div',{class:'street-map-heading'},[el('div',{},[el('span',{class:'street-eyebrow',text:'你好小镇'}),el('h3',{text:mapAnswer?'Chạm nơi con vừa nghe':'Chào mừng đến khu phố nhỏ'})]),el('span',{class:'street-compass','aria-label':'Phía trên bản đồ là hướng Bắc',text:'N ↑'})]));
  const grid=el('div',{class:'street-city'});
  for(const place of streetPlaces){
   const lessons=meta.lessons.filter(l=>l.place_id===place.id&&(admin||l.enabled)),total=lessons.reduce((n,l)=>n+l.total,0),done=lessons.reduce((n,l)=>n+l.completed,0);
   const node=el('button',{type:'button',class:'street-building street-'+place.color,'data-place':place.id,'aria-label':(mapAnswer?'Chọn ':'')+place.name+(mapAnswer?'':` · ${done}/${total} nhiệm vụ`),'aria-pressed':String(selected===place.id)},[image(place),el('span',{class:'street-building-label'},[el('strong',{text:place.hanzi,lang:'zh-CN'}),el('span',{text:place.name})]),el('small',{class:'street-building-progress',text:mapAnswer?'Chọn địa điểm':total?`${done}/${total} nhiệm vụ`:'Đang chuẩn bị'})]);
   if(lessons.some(l=>l.id===data?.lesson.id))node.classList.add('is-current');
   if(total&&done===total&&!admin)node.classList.add('is-complete');
   node.disabled=busy||Boolean(result?.correct)||(!mapAnswer&&!lessons.length);
   node.onclick=()=>{
    if(mapAnswer){if(!heard){status.textContent='Con nghe câu hỏi hoặc mở chữ trước khi chọn nhé.';station.scrollIntoView({block:'start'});return;}selected=place.id;pending=null;updateChoices();station.scrollIntoView({block:'start'});return;}
    loadLesson((lessons.find(l=>l.completed<l.total)||lessons[0]).id);
   };grid.append(node);
  }
  map.append(grid,el('p',{class:'street-map-caption',text:mapAnswer?'Chọn địa điểm theo lời chỉ dẫn vừa nghe.':'Chọn một tòa nhà để mở câu chuyện. Trường học có bài 1, 2 và 3.'}));
 }
 function updateChoices(){
  station.querySelectorAll('button,input,textarea,select').forEach(control=>{control.disabled=busy;});
  app.querySelectorAll('[data-place]').forEach(b=>{b.classList.toggle('is-picked',selected===b.dataset.place);b.setAttribute('aria-pressed',String(selected===b.dataset.place));});
  station.querySelectorAll('input[name=street-choice]').forEach(input=>{input.checked=input.value===selected;input.disabled=busy||Boolean(result?.correct)||!heard;});
  const check=station.querySelector('[data-check]');if(check){check.disabled=busy||!heard||!selected||Boolean(result?.correct);check.textContent=busy?'Đang kiểm tra…':pending?'Thử gửi lại':'Kiểm tra lựa chọn';}
  const chosen=station.querySelector('[data-chosen-place]');if(chosen)chosen.textContent=selected?'Đã chọn: '+streetPlaces.find(p=>p.id===selected)?.name:'Chưa chọn địa điểm.';
 }
 function renderWelcome(){
  station.replaceChildren(el('div',{class:'street-welcome-card'},[el('span',{class:'street-ticket',text:'VÉ KHÁM PHÁ CỦA BẠN'}),el('img',{src:'/assets/images/chinese-street/bank.svg',width:180,height:160,alt:''}),el('h3',{text:meta.lessons.length?'Một chuyến đi, nhiều điều mới':'Khu phố đang chuẩn bị'}),text(meta.lessons.length?'Chọn địa điểm trên bản đồ. Mỗi nhiệm vụ hoàn thành sẽ mang về từ 1 đến 3 sao.':'Cấp này chưa có nhiệm vụ. Con quay lại bài học để tiếp tục nhé.'),el('ol',{},['Nghe câu nói tiếng Trung.','Chọn câu đáp hoặc chạm đúng địa điểm.','Xem giải thích và tiếp tục khám phá.'].map(t=>el('li',{text:t})))]));
 }
 function renderTask(){
  if(!data){complete=false;renderWelcome();renderMap();return;}complete=false;
  const m=mission(),place=streetPlaces.find(p=>p.id===data.place_id),lessonChoices=meta.lessons.filter(l=>l.place_id===data.place_id);
  station.replaceChildren();layout.classList.add('has-mission');
  const top=el('div',{class:'street-station-top'},[el('span',{class:'street-eyebrow',text:admin?'BẢN XEM THỬ · KHÔNG GHI TIẾN ĐỘ':'ĐANG KHÁM PHÁ · '+place.name}),button('Đổi địa điểm',()=>{reset();data=null;layout.classList.remove('has-mission');renderWelcome();renderMap();map.scrollIntoView({block:'start'});})]);station.append(top);
  if(lessonChoices.length>1){const tabs=el('div',{class:'street-lesson-tabs','aria-label':'Bài tại địa điểm này'});for(const l of lessonChoices){const b=button(l.title,()=>loadLesson(l.id));b.setAttribute('aria-pressed',String(l.id===data.lesson.id));tabs.append(b);}station.append(tabs);}
  station.append(el('h3',{class:'street-lesson-title',text:data.lesson.title}));
  if(admin)station.append(text(data.lesson.status==='published'?'Bài học đã xuất bản. Bấm Lưu để cập nhật nhiệm vụ.':'Bài học đang là bản nháp. Học sinh chỉ thấy sau khi cô xuất bản bài học.','street-note'));
  const steps=el('div',{class:'street-mission-steps','aria-label':'Các nhiệm vụ'});data.missions.forEach((task,n)=>{const b=button((task.progress?.completed?'✓ ':'')+(n+1),()=>{index=n;reset();renderTask();station.scrollIntoView({block:'start'});});b.title=task.title;b.setAttribute('aria-label',`Nhiệm vụ ${n+1}: ${task.title}`);b.setAttribute('aria-pressed',String(n===index));b.disabled=busy;steps.append(b);});station.append(steps);
  const card=el('div',{class:'street-mission-card'},[el('div',{class:'street-mission-kicker'},[el('span',{text:`NHIỆM VỤ ${index+1}/${data.missions.length}`}),el('span',{text:m.progress?.stars?'★'.repeat(m.progress.stars):m.type==='map'?'🧭 Tìm địa điểm':'💬 Chọn lời đáp'})]),el('h4',{text:m.title}),text(m.instruction,'street-instruction')]);
  const audio=el('div',{class:'street-audio'});
  for(const [label,slow]of [['▶ Nghe câu nói',false],['▷ Nghe chậm',true]]){const b=button(label,()=>{if(voice.play(m.speech,slow)){heard=true;updateChoices();}},!slow);b.disabled=busy;audio.append(b);}card.append(audio,status);
  const reveal=el('details',{class:'street-reveal'},[el('summary',{text:'Hiện chữ khi cần'}),el('p',{text:m.speech,lang:'zh-CN'})]);reveal.open=revealed;reveal.ontoggle=()=>{revealed=reveal.open;if(reveal.open){heard=true;updateChoices();}};card.append(reveal);
  if(m.type==='choice'){
   const choices=el('fieldset',{class:'street-choices'},[el('legend',{class:'sr-only',text:'Chọn câu trả lời'})]);m.options.forEach((o,i)=>{
    const input=el('input',{type:'radio',name:'street-choice',value:o.id});input.onchange=()=>{selected=o.id;pending=null;updateChoices();};
    choices.append(el('label',{class:'street-choice'},[input,el('span',{class:'street-choice-letter',text:String.fromCharCode(65+i)}),el('span',{text:o.label,lang:'zh-CN'})]));
   });card.append(choices);
  }else card.append(button('Chọn trên bản đồ ↓',()=>map.scrollIntoView({block:'start'})),el('p',{class:'street-map-instruction','data-chosen-place':'',text:'Chưa chọn địa điểm.'}));
  const check=button('Kiểm tra lựa chọn',checkAnswer,true);check.dataset.check='';card.append(check);
  if(result){
   const feedback=el('div',{class:'street-feedback '+(result.correct?'is-correct':'is-wrong'),role:'status',tabindex:-1},[el('strong',{text:result.correct?'Đúng rồi! '+(admin?'':'★'.repeat(result.stars)):'Thử lại một chút nhé'}),text(result.feedback)]);card.append(feedback);
   if(result.correct){
    const last=index===data.missions.length-1;
    card.append(button(last?'Hoàn thành chuyến ghé thăm':'Nhiệm vụ tiếp theo →',()=>{reset();if(last)renderComplete();else{index++;renderTask();station.scrollIntoView({block:'start'});}},true));
   }
  }
  station.append(card);
  if(admin)renderStreetEditor(station,{data,index,onError:showError,onPreview:n=>{index=n;reset();renderTask();station.scrollIntoView({block:'start'});},onSave:saveEditor});
  renderMap();updateChoices();
 }
 async function loadLesson(id){
  if(busy||disposed)return;const version=++loadVersion;busy=true;alert.textContent='Đang mở nhiệm vụ…';renderMap();updateChoices();
  try{
   const next=await request('/street/lessons/'+id);if(disposed||version!==loadVersion)return;
   data=next;index=Math.max(0,data.missions.findIndex(m=>!m.progress.completed));reset();params.set('lesson',id);history.replaceState(null,'','?'+params);
   busy=false;renderTask();station.scrollIntoView({block:'start'});
  }catch(e){showError(e);}finally{if(version===loadVersion){busy=false;renderMap();updateChoices();}}
 }
 async function checkAnswer(){
  if(busy||!heard||!selected||result?.correct)return;
  const m=mission();busy=true;voice.stop();alert.textContent='';updateChoices();renderMap();
  try{
   if(admin)result={correct:selected===m.answer,stars:0,feedback:selected===m.answer?m.feedback:'Chưa đúng rồi. Con nghe lại và thử thêm một lần nhé.'};
   else{
    pending||={choice_id:selected,request_id:crypto.randomUUID(),content_hash:m.content_hash};
    result=await request(`/street/lessons/${data.lesson.id}/missions/${m.id}/answers`,'POST',pending);pending=null;
    m.progress={completed:result.completed,stars:result.stars,wrong_count:result.wrong_count};
    const l=meta.lessons.find(l=>l.id===data.lesson.id);if(l){l.completed=data.missions.filter(m=>m.progress.completed).length;l.stars=data.missions.reduce((n,m)=>n+m.progress.stars,0);}renderStats();
   }
  }catch(e){showError(e);if(e.code==='STREET_CONTENT_CHANGED'){data=null;layout.classList.remove('has-mission');renderWelcome();}}
  finally{busy=false;renderTask();const feedback=station.querySelector('.street-feedback');feedback?.focus({preventScroll:true});feedback?.scrollIntoView({block:'nearest'});}
 }
 function renderComplete(){
  voice.stop();complete=true;const done=data.missions.filter(m=>m.progress.completed).length,stars=data.missions.reduce((n,m)=>n+(m.progress?.stars||0),0);
  station.replaceChildren(el('div',{class:'street-complete'},[el('img',{src:'/assets/images/mascot-lion.svg',width:100,height:112,alt:''}),el('span',{class:'street-eyebrow',text:'MỘT GÓC PHỐ ĐÃ ĐƯỢC KHÁM PHÁ'}),el('h3',{text:admin?'Xem thử đã hoàn thành':done===data.missions.length?'Bạn đã làm được rồi!':'Còn vài điều để khám phá'}),text(admin?'Buổi thử không ghi kết quả học sinh.':`${done}/${data.missions.length} nhiệm vụ · ★ ${stars}/${data.missions.length*3} sao`),button('Quay về bản đồ',()=>{reset();data=null;layout.classList.remove('has-mission');renderWelcome();renderMap();map.scrollIntoView({block:'start'});},true),button('Luyện lại bài này',()=>{index=0;reset();renderTask();}),text('Các ngôi sao đã nhận được giữ lại khi con luyện thêm.','street-note')]));
  map.classList.remove('street-answer-map');renderMap();station.scrollIntoView({block:'start'});
 }
 async function saveEditor(){
  if(busy)return;busy=true;updateChoices();renderMap();
  try{
  const payload={revision:data.revision,enabled:data.enabled,place_id:data.place_id,missions:data.missions.map(({id,title,instruction,speech,type,options,answer,feedback})=>({id,title,instruction,speech,type,options,answer,feedback}))};
  const saved=await request('/street/lessons/'+data.lesson.id,'PUT',payload);data=saved;meta=await request('/street?level='+level);index=Math.min(index,data.missions.length-1);reset();renderStats();renderTask();alert.textContent='Đã lưu nhiệm vụ cho bài này.';
  }finally{busy=false;renderTask();}
 }
 function renderReports(){
  const reports=el('details',{class:'street-reports'},[el('summary',{text:'☷ Tiến độ học sinh trong phố'})]),out=el('div');reports.append(out);app.insertBefore(reports,alert);
  reports.ontoggle=async()=>{if(!reports.open)return;out.textContent='Đang tải tiến độ…';try{const rows=await request('/street/results?level='+level);out.replaceChildren();if(!rows.length)out.append(text('Chưa có lượt chơi. Khi học sinh làm nhiệm vụ, tiến độ sẽ xuất hiện ở đây.'));for(const r of rows)out.append(el('article',{class:'street-report'},[el('strong',{text:r.display_name||r.username}),text(r.lesson_title),el('span',{text:`${r.completed}/${r.total} nhiệm vụ · ★ ${r.stars}/${r.total*3} sao · ${r.wrong_count} lần cần thử lại`}),el('time',{text:new Date(r.updated_at).toLocaleString('vi-VN')})]));}catch(e){out.textContent=e.message;}};
 }
 function dispose(){disposed=true;loadVersion++;voice.dispose();window.removeEventListener('pagehide',dispose);}window.addEventListener('pagehide',dispose);
 station.append(text('Đang chuẩn bị khu phố…'));
 try{meta=await request('/street?level='+level);if(disposed)return;renderStats();renderMap();renderWelcome();if(admin)renderReports();const selected=meta.lessons.find(l=>l.id===params.get('lesson')&&(admin||l.enabled));if(selected)await loadLesson(selected.id);}catch(e){showError(e);station.replaceChildren(text('Chưa mở được khu phố. Con thử tải lại trang nhé.'),button('Thử lại',()=>location.reload()));}
 return dispose;
}
