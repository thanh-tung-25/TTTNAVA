import {api,avatarUrl,escapeHtml} from '/assets/js/api.js';
import {emptyState} from '/assets/js/ui.js';

const root=document.getElementById('admin-diamond-leaderboard');
async function load(){
 try{
  const {data}=await api('/api/v1/admin/diamond-leaderboard');
  root.innerHTML=data.length?data.map((student,index)=>`<div class="rank-row"><span class="rank-number">${index+1}</span><img class="avatar avatar-sm" src="${avatarUrl(student.avatarKey)}" alt=""><div class="rank-main"><strong>${escapeHtml(student.displayName)}</strong><span>${student.grade===null?'Tiếng Trung':`Lớp ${student.grade}`}</span></div><span class="rank-diamonds">💎 ${student.diamonds.toLocaleString('vi-VN')}</span></div>`).join(''):emptyState('🌱','Chưa có kim cương được trao trong 7 ngày qua');
 }catch(error){root.innerHTML=emptyState('😿','Không tải được bảng xếp hạng',error.message);}
}
load();
