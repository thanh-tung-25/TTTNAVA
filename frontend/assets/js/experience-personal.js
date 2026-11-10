import {request,boot,el,card,action,link,input,message,applyPreferences,onboarding} from './experience-ui.js';
const root=document.getElementById('experience-root');let profile,releaseEditor=async()=>{};
async function connections(){
 const rows=await request('/guardian/links'),box=card('Liên kết phụ huynh',el('p',{text:'Tạo mã ghép để đưa cho phụ huynh có Gmail đã xác minh. Phụ huynh gửi yêu cầu, bạn kiểm tra và xác nhận trước khi họ xem báo cáo.'}));
 box.append(action('Tạo mã ghép mới',async()=>{const r=await request('/guardian/code',{method:'POST'});const code=el('input',{class:'input',readonly:true,'aria-label':'Mã ghép phụ huynh',value:r.code});box.append(code,el('p',{text:'Mã có hiệu lực đến '+new Date(r.expiresAt).toLocaleString('vi-VN')+'. Phụ huynh nhập mã tại Góc phụ huynh.'}));code.select();}));
 for(const r of rows){const row=el('div',{class:'experience-row'},[el('div',{},[el('strong',{text:r.guardian_name}),el('p',{text:r.guardian_email+' · '+({pending:'Chờ xác nhận',accepted:'Đã liên kết',declined:'Đã từ chối',revoked:'Đã thu hồi'}[r.status])})])]);
  const respond=choice=>async()=>{await request('/guardian/links/'+r.id,{method:'POST',body:{action:choice}});await main();};
  if(r.needsApproval)row.append(action('Đồng ý',respond('accept')),action('Từ chối',respond('decline')));else if(r.status==='accepted')row.append(action('Thu hồi quyền xem',respond('revoke')));box.append(row);
 }return box;
}
async function galleryEditor(){
 const rows=await request('/gallery'),box=card('Góc trưng bày của mình'),list=el('div',{class:'experience-list'}),title=input('Tên bài muốn giữ',{maxlength:120}),body=input('Bài viết, cách giải hoặc điều mình học được',{multiline:true,class:'input experience-textarea',maxlength:20000});
 let id=null,revision=0,conflict=false,timer,chain=Promise.resolve(),dirty=0;
 const localKey='ttnava-gallery:'+profile.id+':'+profile.course.id,status=el('p',{class:'experience-status',role:'status'});
 try{const local=JSON.parse(sessionStorage.getItem(localKey)||'null');if(local&&(!local.id||rows.some(r=>r.id===local.id&&Number(r.revision)===local.revision))){id=local.id;revision=local.revision;title.node.value=local.title;body.node.value=local.body;}}catch{}
 const keepLocal=()=>sessionStorage.setItem(localKey,JSON.stringify({id,revision,title:title.node.value,body:body.node.value}));
 const save=async()=>{
  clearTimeout(timer);if(!title.node.value.trim()||!body.node.value.trim())return;
  const version=dirty,titleValue=title.node.value,bodyValue=body.node.value;
  chain=chain.catch(()=>{}).then(async()=>{
   if(conflict)throw Error('Bài đã thay đổi ở thiết bị khác. Hãy sao chép nội dung đang viết rồi mở lại bài.');
   status.textContent='Đang lưu…';
   try{const r=await request('/gallery',{method:'POST',body:{...(id?{id}:{}),revision,title:titleValue,body:bodyValue}});id=r.id;revision=r.revision;let row=rows.find(r=>r.id===id);if(!row){row={id};rows.unshift(row);}Object.assign(row,{title:titleValue,body:bodyValue,revision});renderRows();}
   catch(e){if(e.status===409)conflict=true;throw e;}
   if(version===dirty){status.textContent='Đã lưu vào tài khoản';sessionStorage.removeItem(localKey);}else keepLocal();
  });
  try{await chain;}catch(e){status.textContent=e.message;throw e;}
 };
 const renderRows=()=>list.replaceChildren(...rows.map(row=>el('div',{class:'experience-row'},[
  el('strong',{text:row.title}),action('Mở',async()=>{clearTimeout(timer);await chain.catch(()=>{});id=row.id;revision=Number(row.revision);conflict=false;title.node.value=row.title;body.node.value=row.body;sessionStorage.removeItem(localKey);status.textContent='Đã mở bài đã lưu.';}),
  action('Xóa bài lưu',async()=>{if(!confirm('Xóa bài lưu “'+row.title+'”?'))return;clearTimeout(timer);await chain.catch(()=>{});await request('/gallery/'+row.id,{method:'DELETE'});if(id===row.id)sessionStorage.removeItem(localKey);await main();})
 ])));
 for(const node of [title.node,body.node])node.addEventListener('input',()=>{dirty++;keepLocal();clearTimeout(timer);status.textContent='Chưa lưu lên tài khoản · đang giữ bản nháp trong thẻ này';timer=setTimeout(()=>save().catch(()=>{}),900);});
 releaseEditor=async()=>{clearTimeout(timer);await chain.catch(()=>{});};
 box.append(title.wrap,body.wrap,status,el('div',{class:'experience-actions'},[action('Lưu bài',save,true),action('Viết bài mới',async()=>{clearTimeout(timer);await save();id=null;revision=0;conflict=false;sessionStorage.removeItem(localKey);title.node.value='';body.node.value='';status.textContent='';})]),list);renderRows();return box;
}
async function main(){
 await releaseEditor();profile||=await boot('personal');await request('/rewards/sync',{method:'POST'});const [rewards,prefs]=await Promise.all([request('/rewards'),request('/preferences')]);applyPreferences(prefs);message('');root.replaceChildren();
 root.append(el('section',{class:'experience-hero'},[el('div',{},[el('h2',{text:rewards.companion.name}),el('p',{text:'Bạn đồng hành cấp '+rewards.companion.level}),el('strong',{id:'diamond-total',text:rewards.wallet.total+' kim cương đang có'})]),el('img',{src:'/assets/images/mascot-'+rewards.companion.animal+'.svg',alt:rewards.companion.name})]));
 const companion=el('select',{class:'select','aria-label':'Bạn đồng hành'},[['owl','Cú thông thái'],['panda','Gấu trúc'],['bunny','Thỏ nhỏ']].map(([value,text])=>el('option',{value,text})));companion.value=prefs.companion;
 const name=input('Tên bạn đồng hành',{value:prefs.companion_name,maxlength:40}),minutes=el('select',{class:'select','aria-label':'Thời lượng buổi học'},[5,10,15].map(n=>el('option',{value:n,text:n+' phút'})));minutes.value=String(prefs.minutes);
 const font=el('select',{class:'select','aria-label':'Cỡ chữ'},[el('option',{value:'normal',text:'Chữ tiêu chuẩn'}),el('option',{value:'large',text:'Chữ lớn'})]);font.value=prefs.font_scale;
 const rate=el('select',{class:'select','aria-label':'Tốc độ đọc'},[.5,.7,.8,1,1.2,1.5].map(n=>el('option',{value:n,text:'Tốc độ đọc '+n+'×'})));rate.value=String(prefs.speech_rate);
 const effects=el('input',{type:'checkbox',id:'student-effects'});effects.checked=Boolean(Number(prefs.effects_enabled));
 root.append(card('Cài đặt góc học',el('div',{class:'experience-field-group'},[companion,name.wrap,minutes,font,rate,el('label',{for:effects.id},[effects,el('span',{text:' Bật hiệu ứng nhẹ'})])]),action('Lưu cài đặt',async()=>{const r=await request('/preferences',{method:'PUT',body:{companion:companion.value,companion_name:name.node.value,minutes:Number(minutes.value),font_scale:font.value,speech_rate:Number(rate.value),effects_enabled:effects.checked}});applyPreferences(r);message('Đã lưu cài đặt vào tài khoản.');},true),action('Đổi bài đang học trên lớp',()=>onboarding(profile,{force:true}))));
 root.append(card('Bộ sưu tập thành tích',el('div',{class:'experience-grid'},rewards.badges.map(b=>el('div',{class:'experience-empty'},[el('strong',{text:(b.awardedAt?'★ ':'☆ ')+b.title}),el('p',{text:b.awardedAt?'Đạt ngày '+new Date(b.awardedAt).toLocaleDateString('vi-VN'):'Tiếp tục học, sửa lỗi và thực hiện mục tiêu để khám phá.'})])))));
 root.append(card('Vật phẩm cho góc học',el('p',{text:'Đổi bằng kim cương đã học được. Vật phẩm chỉ thay đổi hình thức góc học.'}),el('div',{class:'experience-grid'},rewards.store.map(item=>card(item.title,el('p',{text:item.owned?'Đã sở hữu':item.price+' kim cương'}),item.equipped?el('span',{class:'experience-pill',text:'Đang sử dụng'}):action(item.owned?'Sử dụng':'Đổi vật phẩm',async()=>{await request('/store/'+item.sku+(item.owned?'/equip':'/buy'),{method:'POST'});await main();}))))));
 const recent=await request('/dashboard');root.append(card('Buổi học gần đây',...recent.runs.map(r=>link(r.title+' · '+(r.status==='finished'?'Đã hoàn thành':'Đang học'),r.href))),await galleryEditor(),await connections(),card('Lối tắt của mình',el('div',{class:'experience-actions'},[link('Lịch sử học','/pages/student/history/'),link('Báo cáo 7 ngày','/pages/student/family/'),link('Bài được giao','/pages/student/assignments/'),link('Tìm bài nhanh','/pages/student/study-hub/'),link('Đổi khóa','/pages/student/courses/')])));
}
main().catch(e=>message(e.message,true));
