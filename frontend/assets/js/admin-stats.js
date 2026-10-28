import { api, avatarUrl, escapeHtml } from '/assets/js/api.js';
import { emptyState, initPage } from '/assets/js/ui.js';

const content = document.getElementById('stats-content');

function stat(value, label) {
  return `<div class="stat"><strong>${Number(value).toLocaleString('vi-VN')}</strong><span>${label}</span></div>`;
}

function render(data) {
  const subjectRows = data.bySubject.map((subject) => `
    <tr>
      <td><span class="badge" style="background:${subject.color};color:#fff">${escapeHtml(subject.name)}</span></td>
      <td>${subject.practices.toLocaleString('vi-VN')}</td>
      <td>${subject.exams.toLocaleString('vi-VN')}</td>
    </tr>`).join('');

  const topRows = data.topStudents.length
    ? data.topStudents.map((student, index) => `
      <div class="rank-row">
        <span class="rank-number">${index + 1}</span>
        <img class="avatar avatar-sm" src="${avatarUrl(student.avatarKey)}" alt="">
        <div class="rank-main"><strong>${escapeHtml(student.displayName)}</strong><span>Lớp ${student.grade}</span></div>
        <span class="rank-diamonds">💎 ${student.diamonds.toLocaleString('vi-VN')}</span>
      </div>`).join('')
    : emptyState('🌱', 'Chưa có dữ liệu tuần này');

  content.innerHTML = `
    <section class="card">
      <div class="card-head"><h2>Học sinh</h2></div>
      <div class="grid grid-2">
        ${stat(data.students.total, 'Tổng học sinh')}
        ${stat(data.students.active, 'Đang hoạt động')}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Ngân hàng câu hỏi</h2></div>
      <div class="grid grid-4">
        ${stat(data.bank.subjects, 'Môn học')}
        ${stat(data.bank.topics, 'Chủ đề')}
        ${stat(data.bank.questions, 'Tổng câu hỏi')}
        ${stat(data.bank.publishedQuestions, 'Đã đăng')}
      </div>
      <p class="muted" style="margin:.75rem 0 0;font-size:.82rem">
        Nháp: ${data.bank.draftQuestions.toLocaleString('vi-VN')} ·
        Đang ẩn: ${data.bank.hiddenQuestions.toLocaleString('vi-VN')}
      </p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Hoạt động học tập</h2></div>
      <div class="grid grid-4">
        ${stat(data.practiceSessions, 'Lượt luyện tập')}
        ${stat(data.examAttempts, 'Bài thi đã nộp')}
        ${stat(data.challenges.total, 'Trận thách đấu')}
        ${stat(data.challenges.robot, 'Trận với Robot')}
      </div>
      <p class="muted" style="margin:.8rem 0 0;font-size:.85rem">Tổng kim cương đã trao: <b>${data.diamondsAwarded.toLocaleString('vi-VN')}</b> 💎</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Hoạt động theo môn</h2></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Môn</th><th>Lượt luyện tập</th><th>Bài thi</th></tr></thead>
          <tbody>${subjectRows}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Top 5 tuần này</h2></div>
      <div>${topRows}</div>
    </section>`;
}

async function load() {
  content.innerHTML = '<div class="loading">Đang tải thống kê…</div>';
  try {
    const payload = await api('/api/v1/admin/stats');
    render(payload.data);
  } catch (error) {
    content.innerHTML = emptyState('😿', 'Không tải được thống kê', error.message);
  }
}

document.getElementById('reload-button').addEventListener('click', load);

async function main() {
  await initPage('admin', 'stats');
  await load();
}

main().catch((error) => {
  content.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
