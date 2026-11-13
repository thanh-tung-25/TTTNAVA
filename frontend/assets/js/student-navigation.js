import {escapeHtml} from './api.js';
import {studentNavigationIcon} from './student-navigation-icons.js';
const sections=[['home','/pages/student/home/','Trang chủ','⌂'],['learning','/pages/student/learning/','Bài học','▤'],['arena','/pages/student/arena/','Thử sức','⚑'],['personal','/pages/student/personal/','Cá nhân','☺']];
const extras=[['today','/pages/student/today/','Học hôm nay'],['progress','/pages/student/progress/','Tiến bộ'],['assignments','/pages/student/assignments/','Bài được giao'],['lab','/pages/student/lab/','Hoạt động tương tác'],['family','/pages/student/family/','Báo cáo học tập'],['history','/pages/student/history/','Lịch sử'],['diamonds','/pages/student/diamonds/','Kim cương']];
export function studentNavigation(active,profile){
 const chinese=profile?.course?.kind==='chinese';
 const destinations=sections.map(entry=>chinese&&entry[0]==='home'?['home','/pages/student/courses/?program=chinese','Khóa học','⌂']:chinese&&entry[0]==='learning'?['learning','/pages/student/chinese/','Bài học','▤']:entry);
 const key=['practice','chinese','worksheets'].includes(active)?'learning':['exam','challenge','leaderboard'].includes(active)?'arena':['today','progress'].includes(active)?'home':['family','history','diamonds','assignments','lab'].includes(active)?'personal':active;
 const item=([k,href,label,icon])=>`<a class="nav-link" href="${href}"${key===k?' aria-current="page"':''}><span class="student-nav-icon" aria-hidden="true">${studentNavigationIcon(k,icon||'·')}</span><span>${label}</span></a>`;
 return `<nav class="student-navigation" aria-label="Điều hướng chính"><p class="student-nav-label">GÓC HỌC TẬP</p><div class="student-primary-nav" data-count="${destinations.length}">${destinations.map(item).join('')}</div><details class="student-more" open><summary>Khám phá & tiến bộ</summary><div class="student-personal-nav">${extras.map(item).join('')}</div></details><div class="student-sidebar-note"><img src="/assets/images/mascot-lion.svg" width="100" height="108" alt=""><strong>Mỗi ngày một chút,</strong><span>mình sẽ giỏi hơn!</span></div></nav>`;
}
export function setupStudentNavigation(header,profile){
 const details=header.querySelector('.student-more'),account=header.querySelector('.student-account'),desktop=matchMedia('(min-width:1100px)');
 const update=()=>{if(details)details.open=desktop.matches;};update();desktop.addEventListener('change',update);
 document.addEventListener('click',event=>{if(account&&!account.contains(event.target))account.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&account?.open){account.open=false;account.querySelector('summary').focus();}});
 account?.querySelector('summary').setAttribute('aria-label','Tài khoản của '+profile.displayName);
}
export function studentAccount(profile,avatar,subtitle){
 const studyTools=profile.course?.kind==='chinese'?'<nav class="student-account-study-tools" aria-label="Tiện ích học tập"><a href="/pages/student/chinese/?view=notebook">Sổ từ</a><a href="/pages/student/chinese/?view=history">Kết quả học tập</a><a href="/pages/student/chinese/?view=tests">Bài kiểm tra</a><a href="/pages/student/assignments/">Bài được giao</a></nav>':'';
 return `<details class="student-account"><summary><img class="avatar" src="${avatar}" alt=""><span class="user-meta"><strong>${escapeHtml(profile.displayName)}</strong><span>${escapeHtml(subtitle)}</span></span><span class="account-chevron" aria-hidden="true">⌄</span></summary><div class="student-account-menu"><strong>${escapeHtml(profile.displayName)}</strong><span>${escapeHtml(subtitle)}</span>${studyTools}<a href="/pages/student/personal/">Cài đặt & thành tích</a><a href="/pages/student/courses/?switch=1">Đổi khóa học</a><button class="btn btn-ghost" type="button" id="logout-button">Đăng xuất</button></div></details>`;
}
