import { api, avatarUrl, escapeHtml, queryString } from '/assets/js/api.js';
import { emptyState, initPage } from '/assets/js/ui.js';

const rangeTabs = document.getElementById('range-tabs');
const gradeFilter = document.getElementById('grade-filter');
const listEl = document.getElementById('rank-list');
const weeklyHistoryEl = document.getElementById('weekly-award-history');
const weeklyHistoryTitle = document.getElementById('weekly-history-title');
const awardNote = document.getElementById('leaderboard-award-note');
let range = 'week';
let myId = null;
let chinese = false;
let requestId = 0;
const myRanking = document.getElementById('my-ranking');

function medals(index) {
  return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}`;
}

function row(item, index) {
  const monthly = range === 'month';
  const weeklyAward = Number(item.weeklyAward) || 0;
  const monthlyAward = Number(item.monthlyAward) || 0;
  const award = monthly ? monthlyAward : range === 'week' ? weeklyAward : 0;
  const awardLabel = award ? `Top ${award} ${monthly ? 'tháng trước' : 'tuần trước'}` : '';
  const badge = award
    ? `<span class="leaderboard-award-badge award-${award} period-${monthly?'month':'week'}" role="img" aria-label="${awardLabel}" title="${awardLabel}"><span aria-hidden="true">${monthly?'👑':'🏆'}</span><small>Top ${award}</small></span>`
    : '';
  const avatar = `<img class="avatar avatar-sm" src="${avatarUrl(item.avatarKey)}" alt="">`;
  return `
    <div class="rank-row${item.profileId === myId ? ' is-me' : ''}">
      <span class="rank-number">${chinese&&item.diamonds===0?'#'+item.rank:medals(index)}</span>
      ${avatar}
      <div class="rank-main">
        <strong>${escapeHtml(item.displayName)}${item.profileId === myId ? ' (bạn)' : ''}</strong>
        <span>${chinese||item.grade===null?'Tiếng Trung':'Lớp '+item.grade}</span>
      </div>
      ${badge}<span class="rank-diamonds">💎 ${item.diamonds.toLocaleString('vi-VN')}</span>
    </div>`;
}

function renderAwardHistory(history = []) {
  const monthly = range === 'month';
  weeklyHistoryEl.dataset.period = monthly ? 'month' : 'week';
  const date = value => new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', ...(monthly?{year:'numeric'}:{}), timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
  weeklyHistoryEl.innerHTML = history.map(week => {
    const start = monthly ? week.monthStart : week.weekStart;
    const end = monthly ? week.monthEnd : week.weekEnd;
    const lastDay = new Date(new Date(end).getTime() - 1);
    const winners = week.winners.length
      ? `<ol>${week.winners.map(winner => `<li class="weekly-winner award-${winner.rank}"><span class="weekly-winner-trophy${monthly?' is-month':''}" aria-hidden="true">${monthly?'👑':'🏆'}</span><img class="avatar avatar-sm" src="${avatarUrl(winner.avatarKey)}" alt=""><span class="weekly-winner-name"><strong>${escapeHtml(winner.displayName)}</strong><small>Top ${winner.rank}</small></span><span class="weekly-winner-score">💎 ${winner.diamonds.toLocaleString('vi-VN')}</span></li>`).join('')}</ol>`
      : `<p class="weekly-history-empty">${monthly?'Tháng này':'Tuần này'} chưa có kim cương được ghi nhận.</p>`;
    return `<article class="weekly-history-week"><h3>${date(start)} – ${date(lastDay)}</h3>${winners}</article>`;
  }).join('');
}

function syncTabs() {
  rangeTabs.querySelectorAll('[data-range]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.range === range));
  });
}

async function load() {
  const current = ++requestId;
  syncTabs();
  const monthly = range === 'month';
  weeklyHistoryTitle.textContent = monthly ? 'Top tháng gần đây' : 'Top tuần gần đây';
  awardNote.textContent = monthly
    ? 'Huy hiệu top tháng trước hiển thị trong tháng này: Top 1 cúp vàng, Top 2 cúp bạc, Top 3 cúp đồng.'
    : 'Huy hiệu top tuần trước hiển thị trong tuần này: Top 1 cúp vàng, Top 2 cúp bạc, Top 3 cúp đồng.';
  myRanking.hidden = true;
  listEl.innerHTML = '<div class="loading">Đang tải bảng xếp hạng…</div>';
  try {
    const query = queryString({ range, limit: 50, ...(chinese?{program:'chinese'}:{grade:gradeFilter.value}) });
    const payload = await api(`/api/v1/diamonds/leaderboard${query}`);
    if(current!==requestId)return;
    renderAwardHistory(payload.awardHistory);
    listEl.innerHTML = payload.data.length
      ? payload.data.map(row).join('')
      : emptyState('🏆', 'Chưa có ai trên bảng', 'Hãy là người đầu tiên nhận kim cương nhé!');
    if(chinese){
      const me=payload.data.find(item=>item.profileId===myId);
      myRanking.textContent=me?`Bạn đang ở hạng #${me.rank} · ${me.diamonds.toLocaleString('vi-VN')} kim cương`:'Cùng học để góp mặt trong top 50 nhé!';
      myRanking.hidden=false;
    }
  } catch (error) {
    if(current!==requestId)return;
    weeklyHistoryEl.innerHTML = `<p class="weekly-history-empty">Chưa tải được lịch sử cúp ${monthly?'tháng':'tuần'}.</p>`;
    listEl.innerHTML = emptyState('😿', 'Không tải được bảng xếp hạng', error.message)+'<button class="btn btn-ghost" type="button" data-retry-ranking>Thử lại</button>';
  }
}
listEl.addEventListener('click',event=>{if(event.target.closest('[data-retry-ranking]'))load();});

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
  chinese = profile.course?.kind === 'chinese';
  if(chinese){
    document.title='Xếp hạng Tiếng Trung — TTNAVA';
    document.body.classList.add('chinese-leaderboard');
    document.getElementById('ranking-eyebrow').textContent='CHĂM HỌC MỖI NGÀY';
    document.getElementById('ranking-title').textContent='Đua kim cương Tiếng Trung';
    document.getElementById('ranking-description').textContent='Cùng bạn bè chinh phục bảng xếp hạng!';
    document.getElementById('ranking-filters').hidden=true;
    document.getElementById('ranking-note').hidden=false;
  }
  await load();
}

main().catch((error) => {
  listEl.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
