import { api, avatarUrl, escapeHtml, formatDate, formatDuration } from '/assets/js/api.js';
import { emptyState } from '/assets/js/ui.js';
import { elements, store } from './challenge-context.js';

export async function loadTopicOptions() {
  const subjects = ['toan', 'tieng-viet', 'tieng-anh'];
  const results = await Promise.all(subjects.map((subjectId) => (
    api(`/api/v1/catalog/topics?subjectId=${subjectId}&grade=${store.profile.grade}`).catch(() => ({ data: [] }))
  )));
  store.topics = results
    .flatMap((payload) => payload.data)
    .filter((topic) => topic.questionCount >= 5);
  const names = { toan: 'Toán', 'tieng-viet': 'Tiếng Việt', 'tieng-anh': 'Tiếng Anh' };
  const options = subjects.map((subjectId) => {
    const items = store.topics.filter((topic) => topic.subjectId === subjectId);
    if (!items.length) return '';
    return `<optgroup label="${names[subjectId]}">${items.map((topic) => (
      `<option value="${escapeHtml(topic.id)}">${escapeHtml(topic.name)} (${topic.questionCount} câu)</option>`
    )).join('')}</optgroup>`;
  }).join('');
  const unavailable = '<option value="">Chưa có chủ đề đủ 5 câu đã đăng</option>';
  document.getElementById('invite-topic').innerHTML = options || unavailable;
  document.getElementById('robot-topic').innerHTML = options || unavailable;
  document.getElementById('invite-button').disabled = !options;
  document.getElementById('robot-button').disabled = !options;
}

function summaryItem(item, type) {
  const person = type === 'incoming' ? item.challenger : item.opponent;
  const actions = type === 'incoming'
    ? `<button class="btn btn-sm" data-accept="${item.id}" type="button">Nhận</button>
       <button class="btn btn-ghost btn-sm" data-decline="${item.id}" type="button">Từ chối</button>`
    : `<button class="btn btn-ghost btn-sm" data-cancel="${item.id}" type="button">Huỷ</button>`;
  return `
    <div class="invite-item">
      <img class="avatar avatar-sm" src="${avatarUrl(person.avatarKey)}" alt="">
      <div class="invite-main">
        <h3>${escapeHtml(person.displayName)}</h3>
        <p>${escapeHtml(item.topicName)} · ${formatDuration(item.durationSeconds)} · <span data-countdown="${escapeHtml(item.expiresAt)}">còn 30s</span></p>
      </div>
      <div class="invite-actions">${actions}</div>
    </div>`;
}

function recentItem(item) {
  const me = item.challenger.id === store.profile.id ? item.challenger : item.opponent;
  const other = item.challenger.id === store.profile.id ? item.opponent : item.challenger;
  let outcome = '—';
  if (item.status === 'finished') {
    outcome = item.winnerId === store.profile.id ? '🏆 Thắng' : item.winnerId ? 'Thua' : '🤝 Hoà';
  } else if (item.status === 'cancelled') {
    outcome = item.cancelledReason === 'forfeit' ? 'Bỏ trận' : 'Đã huỷ';
  } else if (item.status === 'expired') {
    outcome = 'Hết hạn';
  }
  return `
    <div class="invite-item">
      <img class="avatar avatar-sm" src="${avatarUrl(other.avatarKey)}" alt="">
      <div class="invite-main">
        <h3>${escapeHtml(me.displayName)} vs ${escapeHtml(other.displayName)}</h3>
        <p>${escapeHtml(item.topicName)} · ${formatDate(item.createdAt)}</p>
      </div>
      <span class="badge">${outcome}</span>
    </div>`;
}

export function renderLobby() {
  if (!store.lobby) return;
  const lobby = store.lobby;
  elements.activeBanner.innerHTML = lobby.activeChallengeId
    ? `<div class="duel-banner"><div><h2>Con đang có trận đấu dở!</h2><p>Vào tiếp tục để không bỏ lỡ thời gian nhé.</p></div>
       <button class="btn" type="button" data-open="${lobby.activeChallengeId}">Tiếp tục</button></div>`
    : '';

  elements.incomingList.innerHTML = lobby.incoming.length
    ? lobby.incoming.map((item) => summaryItem(item, 'incoming')).join('')
    : emptyState('📭', 'Chưa có lời mời nào', 'Khi bạn mời con, lời mời sẽ hiện ở đây trong 30 giây.');
  elements.outgoingList.innerHTML = lobby.outgoing.length
    ? lobby.outgoing.map((item) => summaryItem(item, 'outgoing')).join('')
    : emptyState('✉️', 'Con chưa gửi lời mời nào');
  elements.recentList.innerHTML = lobby.recent.length
    ? lobby.recent.map(recentItem).join('')
    : emptyState('⚔️', 'Chưa có trận nào', 'Thách đấu Robot để làm quen nhé!');
}

export async function loadLobby() {
  try {
    const payload = await api('/api/v1/challenges/lobby');
    store.lobby = payload.data;
    renderLobby();
  } catch (error) {
    elements.incomingList.innerHTML = emptyState('😿', 'Không tải được sảnh', error.message);
  }
}
