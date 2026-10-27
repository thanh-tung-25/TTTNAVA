import { api, avatarUrl, escapeHtml, queryString } from '/assets/js/api.js';
import { emptyState, initPage } from '/assets/js/ui.js';

const rangeTabs = document.getElementById('range-tabs');
const gradeFilter = document.getElementById('grade-filter');
const listEl = document.getElementById('rank-list');
let range = 'week';
let myId = null;

function medals(index) {
  return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}`;
}

function row(item, index) {
  return `
    <div class="rank-row${item.profileId === myId ? ' is-me' : ''}">
      <span class="rank-number">${medals(index)}</span>
      <img class="avatar avatar-sm" src="${avatarUrl(item.avatarKey)}" alt="">
      <div class="rank-main">
        <strong>${escapeHtml(item.displayName)}${item.profileId === myId ? ' (con)' : ''}</strong>
        <span>Lớp ${item.grade}</span>
      </div>
      <span class="rank-diamonds">💎 ${item.diamonds.toLocaleString('vi-VN')}</span>
    </div>`;
}

function syncTabs() {
  rangeTabs.querySelectorAll('[data-range]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.range === range));
  });
}

async function load() {
  syncTabs();
  listEl.innerHTML = '<div class="loading">Đang tải bảng xếp hạng…</div>';
  try {
    const query = queryString({ range, limit: 50, grade: gradeFilter.value });
    const payload = await api(`/api/v1/diamonds/leaderboard${query}`);
    listEl.innerHTML = payload.data.length
      ? payload.data.map(row).join('')
      : emptyState('🏆', 'Chưa có ai trên bảng', 'Hãy là người đầu tiên nhận kim cương nhé!');
  } catch (error) {
    listEl.innerHTML = emptyState('😿', 'Không tải được bảng xếp hạng', error.message);
  }
}

rangeTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-range]');
  if (!button) return;
  range = button.dataset.range;
  load();
});

gradeFilter.addEventListener('change', load);

async function main() {
  const profile = await initPage('student', 'leaderboard');
  myId = profile.id;
  await load();
}

main().catch((error) => {
  listEl.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
