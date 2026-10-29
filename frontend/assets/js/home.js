import { api, avatarUrl, escapeHtml, formatDate, formatPercent } from '/assets/js/api.js';
import { emptyState, initPage } from '/assets/js/ui.js';

const greeting = document.getElementById('greeting');
const gradeLine = document.getElementById('grade-line');

function activityRow(item, kind) {
  const percent = item.percent ?? formatPercent(item.correctCount, item.totalQuestions);
  const badge = item.status === 'finished' || item.status === 'submitted'
    ? `<span class="badge badge-success">${percent}%</span>`
    : '<span class="badge badge-warning">Đang làm</span>';
  return `
    <div class="history-item">
      <div class="history-main">
        <h3>${kind === 'practice' ? '✏️' : '⏱️'} ${escapeHtml(item.topicName)}</h3>
        <p>${escapeHtml(item.subjectName)} · Lớp ${item.grade} · ${formatDate(item.startedAt)}</p>
      </div>
      ${badge}
    </div>
  `;
}

async function load() {
  const profile = await initPage('student', 'home');
  if (profile.grade === null) {
    window.location.replace('/pages/student/chinese/');
    return;
  }
  const hour = new Date().getHours();
  const salute = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  greeting.textContent = `${salute}, ${profile.displayName}!`;
  gradeLine.textContent = profile.grade ? `Học sinh lớp ${profile.grade} · Hôm nay mình cùng tiến bộ nhé!` : 'Hôm nay mình cùng học nhé!';
  document.getElementById('hero-avatar').src = avatarUrl(profile.avatarKey);
  document.getElementById('hero-avatar').alt = `Ảnh đại diện của ${profile.displayName}`;

  const [diamondResult, practiceResult, examResult] = await Promise.allSettled([
    api('/api/v1/diamonds/summary'),
    api('/api/v1/practice/history?limit=3'),
    api('/api/v1/exams/history?limit=3'),
  ]);

  if (diamondResult.status === 'fulfilled') {
    const data = diamondResult.value.data;
    document.getElementById('diamond-total').textContent = data.total.toLocaleString('vi-VN');
    document.getElementById('diamond-week').textContent = data.week.toLocaleString('vi-VN');
    document.getElementById('diamond-month').textContent = data.month.toLocaleString('vi-VN');
  }

  const activities = [];
  if (practiceResult.status === 'fulfilled') {
    for (const item of practiceResult.value.data) activities.push({ item, kind: 'practice' });
  }
  if (examResult.status === 'fulfilled') {
    for (const item of examResult.value.data) activities.push({ item, kind: 'exam' });
  }
  activities.sort((a, b) => new Date(b.item.startedAt) - new Date(a.item.startedAt));
  const container = document.getElementById('recent-activity');
  container.innerHTML = activities.length
    ? activities.slice(0, 5).map(({ item, kind }) => activityRow(item, kind)).join('')
    : emptyState('🌱', 'Chưa có hoạt động nào', 'Con bắt đầu luyện tập để nhận kim cương nhé!');
}

load().catch((error) => {
  document.getElementById('recent-activity').innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
