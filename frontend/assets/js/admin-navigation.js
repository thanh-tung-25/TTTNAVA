import {escapeHtml} from './api.js';

const icons={assignments:'✎',feedback:'♡',courses:'▦',chinese:'▤',students:'♧',questions:'▧',stats:'▥',team:'♙',deployment:'↥'};
export function adminNavigation(entries,active,home){
 const query=new URLSearchParams(location.search),view=query.get('view')||'lessons';
 const sub=[['lessons','Bài học',''],['tests','Bài kiểm tra','?view=tests'],['progress','Tiến độ học sinh','?view=progress'],['levels','Quản lý cấp HSK','?view=levels']];
 const item=([key,href,label])=>`<a class="nav-link" href="${key==='students'&&active==='chinese'?href+'?program=chinese':href}"${key===active?' aria-current="page"':''}><span class="admin-nav-icon" aria-hidden="true">${icons[key]||'·'}</span><span>${escapeHtml(key==='students'&&active==='chinese'?'Học sinh Tiếng Trung':label)}</span>${key==='courses'?'<span id="course-pending-count" class="course-pending-count" hidden></span>':''}</a>`;
 return `<button class="admin-nav-backdrop" type="button" aria-label="Đóng menu" hidden></button><aside class="admin-sidebar" id="admin-sidebar" aria-label="Khu vực quản trị">
 <div class="admin-sidebar-brand"><a class="brand" href="${home}"><img class="brand-mark" src="/assets/images/ttnava-logo.png" width="40" height="40" alt="">TTNAVA</a><button type="button" class="admin-sidebar-close" aria-label="Đóng điều hướng">×</button></div>
 <nav aria-label="Điều hướng chính"><p class="admin-nav-label">GÓC QUẢN TRỊ</p><div class="admin-primary-nav">${entries.map(item).join('')}</div></nav>
 ${active==='chinese'?`<nav class="admin-chinese-navigation" aria-label="Quản trị Tiếng Trung"><p class="admin-nav-label">TIẾNG TRUNG</p>${sub.map(([key,label,suffix])=>`<a class="admin-section-link" href="/pages/admin/chinese/${suffix}"${view===key?' aria-current="page"':''}><span aria-hidden="true">·</span>${label}</a>`).join('')}</nav>`:''}
 <div class="admin-sidebar-note"><img src="/assets/images/mascot-owl.svg" width="94" height="102" alt=""><strong>Mỗi bài học được chăm chút,</strong><span>thêm một bước tiến cho học trò.</span></div></aside>`;
}
export function setupAdminNavigation(header){
 const trigger=header.querySelector('.admin-menu-toggle'),aside=header.querySelector('.admin-sidebar'),backdrop=header.querySelector('.admin-nav-backdrop'),desktop=matchMedia('(min-width:1100px)');
 const close=()=>{document.body.classList.remove('admin-menu-open');trigger.setAttribute('aria-expanded','false');backdrop.hidden=true;if(!desktop.matches)aside.inert=true;};
 trigger.onclick=()=>{const open=trigger.getAttribute('aria-expanded')!=='true';if(!open){close();return;}aside.inert=false;document.body.classList.add('admin-menu-open');trigger.setAttribute('aria-expanded','true');backdrop.hidden=false;aside.querySelector('.admin-sidebar-close').focus();};
 header.querySelector('.admin-sidebar-close').onclick=()=>{close();trigger.focus();};backdrop.onclick=()=>{close();trigger.focus();};
 document.addEventListener('keydown',e=>{if(!document.body.classList.contains('admin-menu-open'))return;if(e.key==='Escape'){close();trigger.focus();}if(e.key==='Tab'){const nodes=[...aside.querySelectorAll('a,button')].filter(n=>n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 const update=()=>{close();aside.inert=!desktop.matches;};desktop.addEventListener('change',update);update();
}
