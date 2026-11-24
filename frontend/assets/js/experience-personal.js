import {request,boot,el,link,input,message,applyPreferences,onboarding} from './experience-ui.js';
import {api,avatarUrl,AVATARS} from './api.js';
import {companionVisual} from './companion-visual.js';
import {galleryPanel,familyPanel} from './personal-panels.js';

const root=document.getElementById('experience-root'),descriptions=new Map();
let profile,prefs,prefsPromise,currentPanel,pendingRelease=Promise.resolve(),sequence=0,guardianRequest=0;
const titles={profile:'Thông tin cá nhân',settings:'Cài đặt học',appearance:'Thành tích & trang trí',gallery:'Bài viết đã lưu',family:'Liên kết phụ huynh'};
const shapes={profile:'<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0M19 4l1 2 2 .3-1.5 1.4.4 2.1L19 8.8l-1.9 1 .4-2.1L16 6.3l2-.3Z"/>',settings:'<path d="M5 7h14M5 17h14"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',appearance:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9Z"/>',gallery:'<path d="M4 4h7c2 0 3 1 3 3v14c0-2-1-3-3-3H4Zm16 0h-6v17c0-2 1-3 3-3h3Z"/>',family:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 4c2 1 3 3 3 6"/>'};
function icon(key){return el('span',{class:'personal-menu-icon personal-icon-'+key,'aria-hidden':'true',html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+shapes[key]+'</svg>'});}
function describe(key,text){const node=descriptions.get(key);if(node)node.textContent=text;}
function settingsDescription(){if(prefs)describe('settings',`${prefs.minutes} phút mỗi buổi · ${prefs.font_scale==='large'?'Chữ lớn':'Chữ tiêu chuẩn'}`);}
async function preferences(fresh=false){
 if(!fresh&&prefs)return prefs;
 if(!fresh&&prefsPromise)return prefsPromise;
 prefsPromise=request('/preferences').then(data=>{prefs=data;applyPreferences(data);settingsDescription();return data;}).finally(()=>{prefsPromise=null;});return prefsPromise;
}
async function guardians(){
 const version=++guardianRequest,rows=await request('/guardian/links');
 if(version===guardianRequest){const pending=rows.filter(r=>r.needsApproval).length;describe('family',pending?pending+' yêu cầu đang chờ xác nhận':'Quản lý quyền xem báo cáo học tập');descriptions.get('family')?.classList.toggle('personal-pending',pending>0);}
 return rows;
}
function button(label,run,status,primary=false){
 const node=el('button',{type:'button',class:'btn '+(primary?'':'btn-ghost'),text:label});
 node.onclick=async()=>{node.disabled=true;if(status)status.textContent='';try{await run();}catch(e){if(status)status.textContent=e.message;else message(e.message,true);}finally{node.disabled=false;}};
 return node;
}
const localStatus=()=>el('p',{class:'personal-local-status',role:'status','aria-live':'polite'});
function active(context){return currentPanel===context&&context.dialog.open;}
function finishClose(context){
 if(context.closing)return context.closing;
 if(currentPanel===context)currentPanel=null;
 context.closing=Promise.resolve(context.release()).catch(()=>{}).finally(()=>context.dialog.remove());pendingRelease=context.closing;
 if(!currentPanel)document.body.classList.remove('personal-dialog-open');return context.closing;
}
function closePanel(context=currentPanel){if(!context)return pendingRelease;const closing=finishClose(context);context.dialog.close();return closing;}
async function openPanel(kind){
 if(currentPanel)await closePanel();else await pendingRelease;
 const heading=el('h2',{id:'personal-panel-title',text:titles[kind],tabindex:'-1'}),body=el('div',{class:'personal-dialog-body'}),dialog=el('dialog',{class:'personal-dialog','aria-labelledby':heading.id});
 const context={kind,dialog,body,release:async()=>{},load:0};currentPanel=context;
 dialog.append(el('header',{class:'personal-dialog-header'},[heading,el('button',{type:'button',class:'personal-dialog-close','aria-label':'Đóng',text:'×',onclick:()=>closePanel(context)})]),body);
 dialog.addEventListener('close',()=>finishClose(context),{once:true});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePanel(context);});
 document.body.append(dialog);document.body.classList.add('personal-dialog-open');dialog.showModal();heading.focus({preventScroll:true});await loadPanel(context);
}
async function loadPanel(context){
 const version=++context.load;context.body.replaceChildren(el('p',{class:'personal-loading',role:'status',text:'Đang tải…'}));
 try{
  let node,release=async()=>{};
  if(context.kind==='profile')node=profileSettings();
  else if(context.kind==='settings')node=await learningSettings(context);
  else if(context.kind==='appearance')node=await appearance(context);
  else if(context.kind==='gallery'){const panel=await galleryPanel(profile,()=>loadPanel(context),e=>panelError(context,e));node=panel.node;release=panel.release;}
  else node=await familyPanel(await guardians(),()=>loadPanel(context),e=>panelError(context,e));
  if(!active(context)||version!==context.load){await release();return;}
  context.release=release;context.body.replaceChildren(node);
 }catch(e){if(!active(context)||version!==context.load)return;context.body.replaceChildren(el('p',{class:'personal-local-status',role:'alert',text:e.message}),button('Thử lại',()=>loadPanel(context)));}
}
function panelError(context,error){if(!active(context))return;let status=context.body.querySelector('.personal-panel-error');if(!status){status=el('p',{class:'personal-local-status personal-panel-error',role:'alert'});context.body.prepend(status);}status.textContent=error.message;status.scrollIntoView({block:'nearest'});}

function profileSettings(){
 const form=el('form',{class:'personal-profile-form'}),status=localStatus();
 const name=input('Tên hiển thị',{value:profile.displayName,maxlength:60,required:''});
 const preview=el('img',{class:'personal-avatar-preview',src:avatarUrl(profile.avatarKey),alt:'Ảnh đại diện xem trước',width:88,height:88});
 let avatarKey=profile.avatarKey==='lion'?'cu':AVATARS.some(item=>item.key===profile.avatarKey)?profile.avatarKey:'meo';
 const avatarButtons=[];
 const avatarOptions=el('div',{class:'personal-avatar-grid',role:'radiogroup','aria-label':'Chọn ảnh đại diện'},AVATARS.map(item=>{
  const selected=item.key===avatarKey,node=el('button',{type:'button',class:'personal-avatar-choice'+(selected?' is-selected':''),role:'radio','aria-checked':String(selected),tabindex:selected?'0':'-1',title:item.name},[el('img',{src:avatarUrl(item.key),alt:'',width:56,height:56,loading:'lazy'}),el('span',{text:item.name})]);
  avatarButtons.push(node);node.onclick=()=>{avatarKey=item.key;preview.src=avatarUrl(avatarKey);avatarButtons.forEach((button,index)=>{const active=AVATARS[index].key===avatarKey;button.classList.toggle('is-selected',active);button.setAttribute('aria-checked',String(active));button.tabIndex=active?0:-1;});};return node;
 }));
 avatarOptions.onkeydown=event=>{if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const current=avatarButtons.findIndex(button=>button===document.activeElement);const next=event.key==='Home'?0:event.key==='End'?avatarButtons.length-1:(current+(event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1)+avatarButtons.length)%avatarButtons.length;avatarButtons[next].focus();avatarButtons[next].click();};
 const save=button('Lưu thông tin',async()=>{
  if(!form.reportValidity())return;
  const result=await api('/api/v1/auth/profile',{method:'PUT',body:{displayName:name.node.value,avatarKey}});
  profile={...profile,...result.data.profile};
  const personalAvatar=document.querySelector('.personal-avatar');if(personalAvatar)personalAvatar.src=avatarUrl(profile.avatarKey);
  const personalName=document.querySelector('.personal-identity h2');if(personalName)personalName.textContent=profile.displayName;
  for(const account of document.querySelectorAll('.student-account')){
   account.querySelectorAll('strong').forEach(node=>node.textContent=profile.displayName);
   account.querySelector('summary')?.setAttribute('aria-label','Tài khoản của '+profile.displayName);
   const image=account.querySelector('img.avatar');if(image)image.src=avatarUrl(profile.avatarKey);
  }
  status.textContent='Đã lưu thông tin cá nhân.';
 },status,true);
 form.append(el('p',{class:'personal-panel-intro',text:'Đổi tên hiển thị và chọn một nhân vật làm ảnh đại diện.'}),el('div',{class:'personal-avatar-editor'},[preview,avatarOptions]),name.wrap,status,save);
 form.onsubmit=event=>{event.preventDefault();save.click();};return form;
}

async function learningSettings(context){
 const saved=await preferences(),form=el('form',{class:'personal-settings'}),status=localStatus();
 const minutes=el('select',{class:'select','aria-label':'Thời lượng buổi học'},[5,10,15].map(n=>el('option',{value:n,text:n+' phút'})));minutes.value=String(saved.minutes);
 const font=el('select',{class:'select','aria-label':'Cỡ chữ'},[el('option',{value:'normal',text:'Chữ tiêu chuẩn'}),el('option',{value:'large',text:'Chữ lớn'})]);font.value=saved.font_scale;
 const rate=el('select',{class:'select','aria-label':'Tốc độ đọc'},[.5,.7,.8,1,1.2,1.5].map(n=>el('option',{value:n,text:n+'×'+(n===1?' · Bình thường':'')})));rate.value=String(saved.speech_rate);
 const field=(label,node)=>el('label',{class:'personal-field'},[el('span',{text:label}),node]);
 const save=button('Lưu cài đặt',async()=>{await request('/preferences',{method:'PUT',body:{minutes:Number(minutes.value),font_scale:font.value,speech_rate:Number(rate.value)}}).then(data=>{prefs=data;applyPreferences(data);settingsDescription();});status.textContent='Đã lưu cài đặt.';},status,true);
 form.append(el('p',{class:'personal-panel-intro',text:'Chọn cách học thoải mái cho bạn.'}),el('div',{class:'personal-fields'},[field('Thời lượng mỗi buổi',minutes),field('Cỡ chữ',font),field('Tốc độ đọc',rate)]),status,save,
  button('Đổi bài đang học trên lớp',async()=>{await closePanel(context);await onboarding(profile,{force:true});},status));
 form.onsubmit=event=>{event.preventDefault();save.click();};return form;
}
async function appearance(context){
 await request('/rewards/sync',{method:'POST'});
 const [saved,initial]=await Promise.all([preferences(),request('/rewards')]);let rewards=initial;
 const content=el('div',{class:'personal-appearance'}),tabbar=el('div',{class:'personal-tabs',role:'tablist','aria-label':'Thành tích và trang trí'}),achievements=el('section',{role:'tabpanel',id:'personal-achievements','aria-labelledby':'personal-tab-achievements'}),decoration=el('section',{role:'tabpanel',id:'personal-decoration','aria-labelledby':'personal-tab-decoration',hidden:''});
 describe('appearance',rewards.badges.filter(b=>b.awardedAt).length+' thành tích đã đạt');
 const panels=[achievements,decoration],tabs=['Thành tích','Trang trí'].map((title,index)=>{
  const node=el('button',{type:'button',role:'tab',id:'personal-tab-'+(index?'decoration':'achievements'),'aria-controls':panels[index].id,'aria-selected':String(index===0),tabindex:index===0?'0':'-1',text:title});
  node.onclick=()=>tabs.forEach((tab,n)=>{const selected=n===index;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;panels[n].hidden=!selected;});return node;
 });
 tabbar.append(...tabs);tabbar.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-tabs.indexOf(document.activeElement);tabs[Math.max(0,next)].click();tabs[Math.max(0,next)].focus();};
 achievements.append(el('p',{class:'personal-panel-intro',text:'Những dấu mốc trên hành trình học của bạn.'}),el('div',{class:'personal-badges'},rewards.badges.map(b=>el('article',{class:'personal-badge'+(b.awardedAt?' is-earned':'')},[el('span',{'aria-hidden':'true',text:b.awardedAt?'★':'☆'}),el('div',{},[el('h3',{text:b.title}),el('p',{text:b.awardedAt?'Đạt ngày '+new Date(b.awardedAt).toLocaleDateString('vi-VN'):'Tiếp tục học để mở khóa'})])]))));
 const friend=companionVisual(saved.companion,saved.companion_name),preview=el('img',{src:friend.image,alt:'',width:68,height:72});
 const companion=el('select',{class:'select','aria-label':'Bạn đồng hành'},[['owl','Sư tử thông thái'],['panda','Gấu trúc'],['bunny','Thỏ nhỏ']].map(([value,text])=>el('option',{value,text})));companion.value=saved.companion;
 const name=input('Tên bạn đồng hành',{value:friend.name,maxlength:40,required:''}),effects=el('input',{type:'checkbox',id:'student-effects'});effects.checked=Boolean(Number(saved.effects_enabled));
 companion.onchange=()=>{preview.src=companionVisual(companion.value,name.node.value).image;};
 const styleStatus=localStatus(),styleForm=el('form',{class:'personal-decoration-form'}),styleSave=button('Lưu giao diện',async()=>{
  if(!styleForm.reportValidity())return;prefs=await request('/preferences',{method:'PUT',body:{companion:companion.value,companion_name:name.node.value,effects_enabled:effects.checked}});applyPreferences(prefs);styleStatus.textContent='Đã lưu giao diện.';
 },styleStatus,true);
 styleForm.append(el('div',{class:'personal-companion experience-hero'},[preview,el('div',{},[el('h3',{text:'Bạn đồng hành'}),el('p',{text:'Cấp '+rewards.companion.level}),companion])]),name.wrap,el('label',{class:'personal-effect',for:effects.id},[effects,el('span',{text:'Bật hiệu ứng nhẹ'})]),styleStatus,styleSave);
 styleForm.onsubmit=event=>{event.preventDefault();styleSave.click();};
 const store=el('div',{class:'personal-store'}),storeStatus=localStatus();
 const renderStore=()=>{
  store.replaceChildren(...rewards.store.filter(item=>item.owned).map(item=>{
   const tile=el('article',{class:'personal-store-item'},[el('h4',{text:item.title})]);
   if(item.equipped)tile.append(el('span',{class:'experience-pill',text:'Đang sử dụng'}));
   else tile.append(button('Sử dụng',async()=>{
    await request('/store/'+item.sku+'/equip',{method:'POST'});
    [rewards,prefs]=await Promise.all([request('/rewards'),preferences(true)]);applyPreferences(prefs);renderStore();storeStatus.textContent='Đã áp dụng vật phẩm.';
   },storeStatus));
   return tile;
  }));
 };
 decoration.append(styleForm);
 if(rewards.store.some(item=>item.owned))decoration.append(el('section',{class:'personal-store-section'},[el('h3',{text:'Trang trí đã sở hữu'}),storeStatus,store]));
 renderStore();
 content.append(tabbar,achievements,decoration);return content;
}
async function main(){
 profile=await boot('personal');message('');
 if(new URLSearchParams(location.search).get('edit')==='profile'){
  document.querySelector('.personal-page>h1').textContent='Chỉnh sửa hồ sơ';
  root.replaceChildren(el('section',{class:'personal-edit-page'},[link('← Quay lại Cá nhân','/pages/student/personal/'),el('h2',{text:'Thông tin cá nhân'}),profileSettings()]));
  return;
 }
 const account=el('section',{class:'personal-account','aria-label':'Thông tin tài khoản'},[el('img',{class:'personal-avatar',src:avatarUrl(profile.avatarKey),alt:'',width:72,height:72}),el('div',{class:'personal-identity'},[el('h2',{text:profile.displayName}),...(profile.username?[el('p',{class:'personal-username',text:'@'+profile.username})]:[]),el('span',{class:'personal-course',text:profile.course?.title||'Chưa chọn khóa học'}),button('Sửa thông tin',()=>openPanel('profile').catch(e=>message(e.message,true)))])]);
 const menu=el('section',{class:'personal-menu','aria-label':'Quản lý cá nhân'});
 const hints={profile:'Đổi tên hiển thị và ảnh đại diện',settings:'Thời lượng, cỡ chữ và tốc độ đọc',appearance:'Xem thành tích, tùy chỉnh góc học',gallery:'Những điều bạn muốn giữ lại',family:'Quản lý quyền xem báo cáo học tập'};
 for(const kind of Object.keys(titles)){
  const description=el('small',{text:hints[kind]});descriptions.set(kind,description);
  menu.append(el('button',{type:'button',class:'personal-menu-row','data-personal-panel':kind,'aria-haspopup':'dialog',onclick:()=>openPanel(kind).catch(e=>message(e.message,true))},[icon(kind),el('span',{class:'personal-menu-text'},[el('strong',{text:titles[kind]}),description]),el('span',{class:'personal-menu-chevron','aria-hidden':'true',text:'›'})]));
 }
 const shortcuts=el('div',{class:'personal-shortcuts'},[link('Lịch sử học','/pages/student/history/'),link('Đổi khóa học','/pages/student/courses/?switch=1')]);
 root.replaceChildren(account,menu,shortcuts);
 preferences().catch(()=>{});guardians().catch(()=>{});
}
main().catch(e=>message(e.message,true));
