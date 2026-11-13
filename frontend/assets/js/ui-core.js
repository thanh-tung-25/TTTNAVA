import { api, avatarUrl, escapeHtml } from './api.js';
import { studentNavigation, setupStudentNavigation, studentAccount } from './student-navigation.js';
import { courseProfile } from './course-context.js';
import { setupCourseNotifications } from './admin-course-notifications.js';
import { adminHome, adminScope, adminLabels, adminSections } from './admin-permissions.js';
import {adminNavigation,setupAdminNavigation} from './admin-navigation.js';

const ADMIN_NAV = [
  ['assignments','/pages/admin/assignments/','Giao bài & phản hồi'],
  ['feedback', '/pages/admin/feedback/', 'Phản ánh người dùng'],
  ['courses', '/pages/admin/courses/', 'Khóa học & thanh toán'],
  ['chinese', '/pages/admin/chinese/', 'Quản lý Tiếng Trung'],
  ['students', '/pages/admin/students/', 'Học sinh'],
  ['access-history','/pages/admin/access-history/','Lịch sử truy cập'],
  ['questions', '/pages/admin/questions/', 'Nội dung học tập'],
  ['stats', '/pages/admin/stats/', 'Thống kê'],
  ['team', '/pages/admin/team/', 'Quản trị viên'],
  ['deployment', '/pages/admin/deployment/', 'Kiểm tra cập nhật'],
];

let currentProfile = null;
let diamondTotal = null;

function renderHeader(profile, role, active) {
  if(active==='worksheets')active='questions';
  const nav = role==='admin'?ADMIN_NAV.filter(([key])=>adminSections(profile).includes(key)).map(entry=>entry[0]==='courses'&&adminScope(profile)==='chinese'?[entry[0],entry[1],'Đăng ký Tiếng Trung']:entry):ADMIN_NAV;
  const home = role === 'admin' ? adminHome(profile) : '/pages/student/courses/';
  const subtitle = role === 'admin'
    ? adminLabels[adminScope(profile)]
    : (profile.course?.title ?? (profile.grade ? `Học sinh lớp ${profile.grade}` : 'Học sinh Tiếng Trung'));

  const header = document.getElementById('app-header');
  header.className = 'topbar';
  header.innerHTML = `
    <div class="topbar-inner">
      ${role==='admin'?'<button type="button" class="admin-menu-toggle" aria-label="Mở điều hướng quản trị" aria-expanded="false" aria-controls="admin-sidebar">☰</button><span class="admin-topbar-title">Không gian quản trị</span>':''}
      <a class="brand" href="${home}"><img class="brand-mark" src="/assets/images/ttnava-logo.png" alt="" width="44" height="44"> TTNAVA</a>
      <div class="topbar-user">
        ${role==='student'?'<a class="btn btn-ghost btn-sm course-switch" href="/pages/student/courses/">Đổi khóa</a>':''}
        ${role === 'student' ? '<span class="diamond-chip" id="diamond-chip" title="Kim cương của con">💎 <span>…</span></span>' : ''}
        ${role === 'student' ? studentAccount(profile, avatarUrl(profile.avatarKey), subtitle) : `<img class="avatar" src="${avatarUrl(profile.avatarKey)}" alt="Ảnh đại diện của ${escapeHtml(profile.displayName)}">
        <span class="user-meta"><strong>${escapeHtml(profile.displayName)}</strong><span>${subtitle}</span></span>
        <button class="btn btn-ghost btn-sm" type="button" id="logout-button">Thoát</button>`}
      </div>
    </div>
    ${role === 'student' ? studentNavigation(active, profile) : adminNavigation(nav,active,home)}
  `;
  if (role === 'student') setupStudentNavigation(header, profile);
  else {setupAdminNavigation(header);if(adminSections(profile).includes('courses')) setupCourseNotifications();}

  header.querySelector('#logout-button').addEventListener('click', async () => {
    localStorage.removeItem('ttnava-course');
    document.cookie='ttnava_course=; Path=/; Max-Age=0; SameSite=Lax';
    try {
      await api('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Vẫn chuyển về trang đăng nhập dù lỗi mạng.
    }
    window.location.replace('/pages/login/');
  });
}

export async function initPage(role, active) {
  document.body.dataset.role = role;
  if(role==='admin'){
    document.body.classList.add('admin-unified');
    if(!document.querySelector('link[data-admin-design]')){const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/admin-unified.css';style.dataset.adminDesign='true';document.head.append(style);}
  }
  if(role==='student'){
    document.body.classList.add('student-unified');
    if(!document.querySelector('link[data-student-design]')){const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/student-unified.css';style.dataset.studentDesign='true';document.head.append(style);}
  }
  const payload = await api('/api/v1/auth/me');
  const profile = payload.data.profile;
  if (profile.role !== role) {
    window.location.replace(profile.role === 'admin' ? adminHome(profile) : '/pages/student/home/');
    throw new Error('SAI_VAI_TRO');
  }
  currentProfile = profile;
  if(role==='admin'&&!adminSections(profile).includes(active==='worksheets'?'questions':active)) {
    window.location.replace(adminHome(profile));
    throw new Error('Bạn không có quyền quản lý phần này.');
  }
  if(role==='student')await courseProfile(profile,active);
  if(role==='student'){
    document.body.dataset.program=profile.course?.kind||'';
    if(!document.querySelector('link[data-experience-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/student-experience.css';style.dataset.experienceStyle='true';document.head.append(style);}
    import('./experience-ui.js').then(async({request,applyPreferences})=>applyPreferences(await request('/preferences'))).catch(()=>{});
  }
  renderHeader(profile, role, active);
  import('./learning-feedback.js').then(({setupFeedback})=>setupFeedback(profile)).catch(()=>{});
  if(role==='student'&&profile.course?.kind==='chinese'&&['home','learning'].includes(active))import('./study-reminders.js').then(({showStudyReminders})=>showStudyReminders()).catch(()=>{});
  if(role==='student'||role==='admin')import('./chat-widget.js').then(({setupChat})=>setupChat(profile)).catch(()=>{});
  if (role === 'student') loadDiamonds();
  return profile;
}

export function getProfile() {
  return currentProfile;
}

async function loadDiamonds() {
  try {
    const payload = await api('/api/v1/diamonds/summary');
    diamondTotal = payload.data.total;
    updateDiamondChip();
  } catch {
    // Không chặn trang nếu chưa tải được kim cương.
  }
}

export function updateDiamondChip() {
  const chip = document.getElementById('diamond-chip');
  if (!chip) return;
  chip.querySelector('span').textContent = new Intl.NumberFormat('vi-VN').format(diamondTotal ?? 0);
}

export function setDiamondTotal(value) {
  diamondTotal = Number(value) || 0;
  updateDiamondChip();
}

export async function syncDiamondTotal() {
  try {
    const payload = await api('/api/v1/diamonds/summary');
    setDiamondTotal(payload.data.total);
  } catch {
    // Không chặn màn hình kết quả nếu chưa tải được số kim cương.
  }
}
