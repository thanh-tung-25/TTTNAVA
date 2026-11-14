import {request,el,action,input} from './experience-ui.js';

export async function familyPanel(rows,refresh,onError){
 const box=el('section',{class:'personal-family'}),codeBox=el('div',{class:'personal-family-code'});
 box.append(el('p',{class:'personal-panel-intro',text:'Liên kết để phụ huynh có thể xem báo cáo học tập. Bạn xác nhận trước khi cấp quyền xem.'}));
 const makeCode=action('Tạo mã ghép phụ huynh',async()=>{
  try{const r=await request('/guardian/code',{method:'POST'}),code=el('input',{class:'input',readonly:true,'aria-label':'Mã ghép phụ huynh',value:r.code});
   codeBox.replaceChildren(code,el('p',{class:'experience-status',text:'Mã có hiệu lực đến '+new Date(r.expiresAt).toLocaleString('vi-VN')+'. Phụ huynh nhập mã tại Góc phụ huynh.'}));code.focus();code.select();
  }catch(e){onError(e);}
 });
 box.append(makeCode,codeBox);
 for(const r of rows){
  const row=el('div',{class:'experience-row personal-family-row'},[el('div',{},[el('strong',{text:r.guardian_name}),el('p',{text:r.guardian_email}),el('span',{class:'experience-status',text:({pending:'Chờ xác nhận',accepted:'Đã liên kết',declined:'Đã từ chối',revoked:'Đã thu hồi'}[r.status])})])]);
  const respond=choice=>async()=>{try{await request('/guardian/links/'+r.id,{method:'POST',body:{action:choice}});await refresh();}catch(e){onError(e);}};
  const controls=el('div',{class:'experience-actions'});
  if(r.needsApproval)controls.append(action('Đồng ý',respond('accept'),true),action('Từ chối',respond('decline')));
  else if(r.status==='accepted')controls.append(action('Thu hồi quyền xem',respond('revoke')));
  row.append(controls);box.append(row);
 }
 if(!rows.length)box.append(el('p',{class:'personal-empty',text:'Chưa liên kết với phụ huynh.'}));
 return box;
}

export async function galleryPanel(profile,refresh,onError){
 const rows=await request('/gallery'),box=el('section',{class:'personal-gallery'}),list=el('div',{class:'experience-list'}),title=input('Tên bài muốn giữ',{maxlength:120}),body=input('Bài viết, cách giải hoặc điều mình học được',{multiline:true,class:'input experience-textarea',maxlength:20000});
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
 const renderRows=()=>list.replaceChildren(...rows.map(row=>el('div',{class:'experience-row personal-gallery-row'},[
  el('strong',{text:row.title}),el('div',{class:'experience-actions'},[
   action('Mở',async()=>{clearTimeout(timer);await chain.catch(()=>{});id=row.id;revision=Number(row.revision);conflict=false;title.node.value=row.title;body.node.value=row.body;sessionStorage.removeItem(localKey);status.textContent='Đã mở bài đã lưu.';}),
   action('Xóa bài lưu',async()=>{try{if(!confirm('Xóa bài lưu “'+row.title+'”?'))return;clearTimeout(timer);await chain.catch(()=>{});await request('/gallery/'+row.id,{method:'DELETE'});if(id===row.id)sessionStorage.removeItem(localKey);await refresh();}catch(e){onError(e);}})
  ])
 ])));
 for(const node of [title.node,body.node])node.addEventListener('input',()=>{dirty++;keepLocal();clearTimeout(timer);status.textContent='Đang giữ bản nháp trong thẻ này';timer=setTimeout(()=>save().catch(()=>{}),900);});
 const safe=fn=>async()=>{try{await fn();}catch(e){onError(e);}};
 box.append(el('p',{class:'personal-panel-intro',text:'Lưu lại bài viết hoặc điều bạn muốn nhớ.'}),title.wrap,body.wrap,status,el('div',{class:'experience-actions'},[
  action('Lưu bài',safe(save),true),action('Viết bài mới',safe(async()=>{clearTimeout(timer);await save();id=null;revision=0;conflict=false;sessionStorage.removeItem(localKey);title.node.value='';body.node.value='';status.textContent='';}))
 ]),list);renderRows();
 return {node:box,release:async()=>{clearTimeout(timer);await chain.catch(()=>{});}};
}
