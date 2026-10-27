import { api, escapeHtml, formatDate } from '/assets/js/api.js';
import { emptyState, initPage, setDiamondTotal } from '/assets/js/ui.js';

const REASONS = {
  practice_complete: ['✏️', 'Hoàn thành luyện tập'],
  practice_perfect: ['🌟', 'Luyện tập đúng hết'],
  exam_complete: ['⏱️', 'Hoàn thành bài thi'],
  exam_perfect: ['🏅', 'Bài thi đúng hết'],
  challenge_win: ['⚔️', 'Thắng trận thách đấu'],
  challenge_loss: ['🤝', 'Hoàn thành trận thách đấu'],
  challenge_draw: ['🤝', 'Hoà trận thách đấu'],
};

function row(item) {
  const [icon, label] = REASONS[item.reason] ?? ['💎', item.reason];
  return `
    <div class="ledger-row">
      <span aria-hidden="true">${icon}</span>
      <div>
        <strong>${escapeHtml(label)}</strong><br>
        <time>${formatDate(item.createdAt)}</time>
      </div>
      <span class="ledger-amount">+${item.amount}</span>
    </div>`;
}

async function main() {
  await initPage('student', 'diamonds');
  const payload = await api('/api/v1/diamonds/summary');
  const data = payload.data;
  setDiamondTotal(data.total);
  document.getElementById('diamond-total').textContent = data.total.toLocaleString('vi-VN');
  document.getElementById('diamond-week').textContent = `Tuần này: ${data.week.toLocaleString('vi-VN')}`;
  document.getElementById('diamond-month').textContent = `Tháng này: ${data.month.toLocaleString('vi-VN')}`;
  document.getElementById('ledger-list').innerHTML = data.recent.length
    ? data.recent.map(row).join('')
    : emptyState('💎', 'Chưa có kim cương nào', 'Con luyện tập hoặc thi để nhận kim cương nhé!');
}

main().catch((error) => {
  document.getElementById('ledger-list').innerHTML = emptyState('😿', 'Không tải được kim cương', error.message);
});
