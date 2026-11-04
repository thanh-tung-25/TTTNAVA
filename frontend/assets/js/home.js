import { api, avatarUrl, escapeHtml, formatDate, formatPercent } from '/assets/js/api.js';
import { emptyState, initPage } from '/assets/js/ui.js';
import { configureChineseHome, chineseActivityRow } from './home-chinese.js';

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
  const isChinese = profile.grade === null;
  if (isChinese) configureChineseHome();
  const hour = new Date().getHours();
  const salute = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  greeting.textContent = `${salute}, ${profile.displayName}!`;
  gradeLine.textContent = `${profile.course?.title || (profile.grade ? 'Lớp '+profile.grade : 'Khóa HSK')} · Hôm nay mình cùng tiến bộ nhé!`;
  document.getElementById('hero-avatar').src = avatarUrl(profile.avatarKey);
  document.getElementById('hero-avatar').alt = `Ảnh đại diện của ${profile.displayName}`;

  const [diamondResult, practiceResult, examResult] = await Promise.allSettled([
    api('/api/v1/diamonds/summary'),
    api(isChinese ? '/api/v1/chinese/history' : '/api/v1/practice/history?limit=3'),
    isChinese ? Promise.resolve(null) : api('/api/v1/exams/history?limit=3'),
  ]);

  if (diamondResult.status === 'fulfilled') {
    const data = diamondResult.value.data;
    document.getElementById('diamond-total').textContent = data.total.toLocaleString('vi-VN');
    document.getElementById('diamond-week').textContent = data.week.toLocaleString('vi-VN');
    document.getElementById('diamond-month').textContent = data.month.toLocaleString('vi-VN');
  }

  const activities = [];
  const container = document.getElementById('recent-activity');
  if (isChinese) {
    container.innerHTML = practiceResult.status === 'fulfilled'
      ? (practiceResult.value.data.slice(0, 5).map(chineseActivityRow).join('')
        || emptyState('🌱', 'Mình bắt đầu học nhé!', 'Chọn Bài học HSK để khám phá Tiếng Trung.'))
      : emptyState('😿', 'Chưa tải được hoạt động', practiceResult.reason.message);
    return;
  }
  if (practiceResult.status === 'fulfilled') {
    for (const item of practiceResult.value.data) activities.push({ item, kind: 'practice' });
  }
  if (examResult.status === 'fulfilled') {
    for (const item of examResult.value.data) activities.push({ item, kind: 'exam' });
  }
  activities.sort((a, b) => new Date(b.item.startedAt) - new Date(a.item.startedAt));
  container.innerHTML = activities.length
    ? activities.slice(0, 5).map(({ item, kind }) => activityRow(item, kind)).join('')
    : emptyState('🌱', 'Chưa có hoạt động nào', 'Con bắt đầu luyện tập để nhận kim cương nhé!');
}

load().catch((error) => {
  document.getElementById('recent-activity').innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
