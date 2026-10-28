import { avatarUrl, escapeHtml, formatDuration } from '/assets/js/api.js';
import { syncDiamondTotal } from '/assets/js/ui.js';
import {
  STATUS_LABELS,
  elements,
  requestLobby,
  store,
} from './challenge-context.js';
import { renderFeedbackCard, renderQuestionCard } from './challenge-question-view.js';

function playerCard(player, suffix = '') {
  return `
    <img src="${avatarUrl(player.avatarKey)}" alt="">
    <strong>${escapeHtml(player.displayName)}${suffix}</strong>
    <span>${player.correct}/${player.answered} câu đúng</span>`;
}

function updateMatchHeader() {
  const match = store.match;
  if (!match) return;
  document.getElementById('me-player').innerHTML = playerCard(match.me, ' (con)');
  document.getElementById('opponent-player').innerHTML = playerCard(match.opponent);
  document.getElementById('match-topic').textContent = match.topic.name;
  elements.matchStatus.textContent = STATUS_LABELS[match.status] ?? match.status;
  elements.forfeitButton.classList.toggle('hidden', !['pending', 'accepted', 'in_progress'].includes(match.status));
}

function renderResult() {
  const match = store.match;
  const meReward = match.result?.me;
  const tie = match.result?.tie ?? (!match.winnerId && match.status === 'finished');
  let title = 'Trận đấu đã kết thúc';
  let emoji = '🏁';
  if (match.status === 'finished') {
    if (tie) { title = 'Hoà rồi! 🤝'; emoji = '🤝'; }
    else if (match.winnerId === match.me.id) { title = 'Con thắng rồi!'; emoji = '🎉'; }
    else { title = 'Con thua rồi'; emoji = '🌱'; }
  } else if (match.status === 'cancelled') {
    title = match.cancelledReason === 'forfeit' ? 'Trận đấu đã bị bỏ' : 'Trận đấu đã huỷ';
    emoji = '🚪';
  } else if (match.status === 'expired') {
    title = 'Lời mời đã hết hạn';
    emoji = '⌛';
  }
  elements.matchTimer.textContent = '--:--';
  elements.matchBody.innerHTML = `
    <article class="card">
      <div class="result-hero">
        <span class="result-emoji">${emoji}</span>
        <h1>${title}</h1>
        <p class="muted">${escapeHtml(match.topic.name)} · ${formatDuration(match.durationSeconds)}</p>
        <div class="result-stats">
          <span class="badge badge-success">Con: ${match.me.correct}/${match.me.answered} đúng</span>
          <span class="badge badge-warning">${escapeHtml(match.opponent.displayName)}: ${match.opponent.correct}/${match.opponent.answered} đúng</span>
        </div>
        ${meReward ? `<p style="margin-top:.8rem"><b>💎 +${meReward.amount} kim cương</b></p>` : ''}
      </div>
      <div class="quiz-actions" style="justify-content:center">
        <button class="btn" id="back-to-lobby" type="button">Về sảnh thách đấu</button>
      </div>
    </article>`;
  document.getElementById('back-to-lobby').addEventListener('click', () => {
    store.match = null;
    requestLobby();
  });
  if (match.status === 'finished') syncDiamondTotal();
}

export function renderMatch() {
  const match = store.match;
  if (!match) return;
  updateMatchHeader();

  if (match.status === 'pending') {
    elements.matchBody.innerHTML = `
      <article class="card center">
        <h2>Đã gửi lời mời 💌</h2>
        <p class="muted">Đang chờ ${escapeHtml(match.opponent.displayName)} nhận lời. Lời mời hết hạn sau 30 giây.</p>
        <div class="countdown-big" data-expiry="${escapeHtml(match.expiresAt)}">30</div>
        <p class="countdown-label">giây</p>
      </article>`;
    elements.matchTimer.textContent = '--:--';
    return;
  }

  if (match.status === 'accepted') {
    elements.matchBody.innerHTML = `
      <article class="card center">
        <h2>Chuẩn bị nào!</h2>
        <p class="muted">Trận đấu bắt đầu sau</p>
        <div class="countdown-big" data-start="${escapeHtml(match.startedAt)}">5</div>
        <p class="countdown-label">giây</p>
      </article>`;
    elements.matchTimer.textContent = formatDuration(match.durationSeconds);
    return;
  }

  if (match.status === 'in_progress') {
    if (match.isWaitingResult) {
      elements.matchBody.innerHTML = '<article class="card center"><h2>Hết giờ! ⏳</h2><p class="muted">Đang tổng kết kết quả, con chờ một chút nhé…</p><div class="loading">Đang tổng kết</div></article>';
      elements.matchTimer.textContent = '00:00';
      return;
    }

    if (store.feedback) {
      renderFeedbackCard();
      return;
    }

    if (!match.myQuestion) {
      elements.matchBody.innerHTML = '<article class="card center"><h2>Đang tải câu hỏi…</h2><div class="loading">Chờ một chút</div></article>';
      return;
    }
    renderQuestionCard(match.myQuestion);
    return;
  }

  renderResult();
}
