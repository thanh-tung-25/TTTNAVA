import { escapeHtml } from './api.js';

const primary = [
 ['home', '/pages/student/home/', 'Trang chủ', '⌂'],
 ['chinese', '/pages/student/chinese/', 'Tiếng Trung', '文'],
 ['practice', '/pages/student/practice/', 'Luyện tập', '✎'],
 ['exam', '/pages/student/exam/', 'Thi thử', '◷'],
];
const personal = [
 ['challenge', '/pages/student/challenge/', 'Thách đấu', '⚑'],
 ['leaderboard', '/pages/student/leaderboard/', 'Xếp hạng', '★'],
 ['diamonds', '/pages/student/diamonds/', 'Kim cương', '◇'],
 ['history', '/pages/student/history/', 'Lịch sử học', '↺'],
];
export function studentNavigation(active) {
 const item = ([key, href, label, icon]) => `<a class="nav-link" href="${href}"${active === key ? ' aria-current="page"' : ''}><span class="student-nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`;
 return `<nav class="student-navigation" aria-label="Điều hướng chính"><p class="student-nav-label">GÓC HỌC TẬP</p><div class="student-primary-nav">${primary.map(item).join('')}</div><details class="student-more"${personal.some(([key]) => key === active) ? ' data-active="true"' : ''}><summary><span aria-hidden="true">▦</span> Thêm <span class="student-more-arrow" aria-hidden="true">⌄</span></summary><div class="student-personal-nav"><p class="student-nav-label">KHÁM PHÁ & TIẾN BỘ</p>${personal.map(item).join('')}</div></details><div class="student-sidebar-note"><img src="/assets/avatars/cu.svg" width="68" height="68" alt=""><strong>Mỗi ngày một chút,</strong><span>mình sẽ giỏi hơn!</span></div></nav>`;
}
export function setupStudentNavigation(header, profile) {
 const details = header.querySelector('.student-more');
 const account = header.querySelector('.student-account');
 const desktop = matchMedia('(min-width: 1100px)');
 const update = () => { details.open = desktop.matches; };
 update();desktop.addEventListener('change', update);
 document.addEventListener('click', event => {
  if (!desktop.matches && !details.contains(event.target)) details.open = false;
  if (!account.contains(event.target)) account.open = false;
 });
 document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !desktop.matches && details.open) {
   details.open = false;details.querySelector('summary').focus();
  }
  if (event.key === 'Escape' && account.open) {
   account.open = false;account.querySelector('summary').focus();
  }
 });
 header.querySelector('.student-account summary').setAttribute('aria-label', `Tài khoản của ${profile.displayName}`);
}
export function studentAccount(profile, avatar, subtitle) {
 return `<details class="student-account"><summary><img class="avatar" src="${avatar}" alt=""><span class="user-meta"><strong>${escapeHtml(profile.displayName)}</strong><span>${subtitle}</span></span><span class="account-chevron" aria-hidden="true">⌄</span></summary><div class="student-account-menu"><strong>${escapeHtml(profile.displayName)}</strong><span>${subtitle}</span><button class="btn btn-ghost" type="button" id="logout-button">Đăng xuất</button></div></details>`;
}
