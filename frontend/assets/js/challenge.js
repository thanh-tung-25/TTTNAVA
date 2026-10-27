import { api, avatarUrl, escapeHtml, formatDate, formatDuration } from '/assets/js/api.js';
import {
  answerText,
  confirmAction,
  emptyState,
  initPage,
  syncDiamondTotal,
  toast,
  TYPE_LABELS,
} from '/assets/js/ui.js';

const lobbyView = document.getElementById('lobby-view');
const matchView = document.getElementById('match-view');
const incomingList = document.getElementById('incoming-list');
const outgoingList = document.getElementById('outgoing-list');
const recentList = document.getElementById('recent-list');
const activeBanner = document.getElementById('active-banner');
const matchBody = document.getElementById('match-body');
const matchTimer = document.getElementById('match-timer');
const matchStatus = document.getElementById('match-status');
const forfeitButton = document.getElementById('forfeit-button');

let profile = null;
let topics = [];
let lobby = null;
let match = null;
let feedback = null;
let selection = null;
let busy = false;
let selectedLevel = 'easy';
let socket = null;
let lastAutoRefresh = 0;

const STATUS_LABELS = {
  pending: 'Đang chờ bạn nhận lời',
  accepted: 'Chuẩn bị bắt đầu',
  in_progress: 'Đang thi đấu',
  finished: 'Đã kết thúc',
  cancelled: 'Đã huỷ',
  expired: 'Lời mời hết hạn',
};

function remainingText(iso, prefix = 'còn') {
  if (!iso) return '';
  const seconds = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  return `${prefix} ${seconds}s`;
}

async function loadTopicOptions() {
  const subjects = ['toan', 'tieng-viet', 'tieng-anh'];
  const results = await Promise.all(subjects.map((subjectId) => (
    api(`/api/v1/catalog/topics?subjectId=${subjectId}&grade=${profile.grade}`).catch(() => ({ data: [] }))
  )));
  topics = results.flatMap((payload) => payload.data);
  const names = { toan: 'Toán', 'tieng-viet': 'Tiếng Việt', 'tieng-anh': 'Tiếng Anh' };
  const options = subjects.map((subjectId) => {
    const items = topics.filter((topic) => topic.subjectId === subjectId);
    if (!items.length) return '';
    return `<optgroup label="${names[subjectId]}">${items.map((topic) => (
      `<option value="${escapeHtml(topic.id)}">${escapeHtml(topic.name)}</option>`
    )).join('')}</optgroup>`;
  }).join('');
  document.getElementById('invite-topic').innerHTML = options;
  document.getElementById('robot-topic').innerHTML = options;
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
  const me = item.challenger.id === profile.id ? item.challenger : item.opponent;
  const other = item.challenger.id === profile.id ? item.opponent : item.challenger;
  let outcome = '—';
  if (item.status === 'finished') {
    outcome = item.winnerId === profile.id ? '🏆 Thắng' : item.winnerId ? 'Thua' : '🤝 Hoà';
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

function renderLobby() {
  if (!lobby) return;
  activeBanner.innerHTML = lobby.activeChallengeId
    ? `<div class="duel-banner"><div><h2>Con đang có trận đấu dở!</h2><p>Vào tiếp tục để không bỏ lỡ thời gian nhé.</p></div>
       <button class="btn" type="button" data-open="${lobby.activeChallengeId}">Tiếp tục</button></div>`
    : '';

  incomingList.innerHTML = lobby.incoming.length
    ? lobby.incoming.map((item) => summaryItem(item, 'incoming')).join('')
    : emptyState('📭', 'Chưa có lời mời nào', 'Khi bạn mời con, lời mời sẽ hiện ở đây trong 30 giây.');
  outgoingList.innerHTML = lobby.outgoing.length
    ? lobby.outgoing.map((item) => summaryItem(item, 'outgoing')).join('')
    : emptyState('✉️', 'Con chưa gửi lời mời nào');
  recentList.innerHTML = lobby.recent.length
    ? lobby.recent.map(recentItem).join('')
    : emptyState('⚔️', 'Chưa có trận nào', 'Thách đấu Robot để làm quen nhé!');
}

async function loadLobby({ silent = false } = {}) {
  try {
    const payload = await api('/api/v1/challenges/lobby');
    lobby = payload.data;
    if (!silent) renderLobby();
    else renderLobby();
  } catch (error) {
    incomingList.innerHTML = emptyState('😿', 'Không tải được sảnh', error.message);
  }
}

function show(view) {
  lobbyView.classList.toggle('hidden', view !== 'lobby');
  matchView.classList.toggle('hidden', view !== 'match');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function openMatch(id) {
  try {
    const payload = await api(`/api/v1/challenges/${id}`);
    match = payload.data;
    feedback = null;
    selection = null;
    show('match');
    renderMatch();
  } catch (error) {
    toast(error.message, 'error');
    show('lobby');
    loadLobby();
  }
}

function playerCard(player, suffix = '') {
  return `
    <img src="${avatarUrl(player.avatarKey)}" alt="">
    <strong>${escapeHtml(player.displayName)}${suffix}</strong>
    <span>${player.correct}/${player.answered} câu đúng</span>`;
}

function updateMatchHeader() {
  if (!match) return;
  document.getElementById('me-player').innerHTML = playerCard(match.me, ' (con)');
  document.getElementById('opponent-player').innerHTML = playerCard(match.opponent);
  document.getElementById('match-topic').textContent = match.topic.name;
  matchStatus.textContent = STATUS_LABELS[match.status] ?? match.status;
  forfeitButton.classList.toggle('hidden', !['pending', 'accepted', 'in_progress'].includes(match.status));
}

function renderMatch() {
  if (!match) return;
  updateMatchHeader();
  feedback = feedback ?? null;

  if (match.status === 'pending') {
    matchBody.innerHTML = `
      <article class="card center">
        <h2>Đã gửi lời mời 💌</h2>
        <p class="muted">Đang chờ ${escapeHtml(match.opponent.displayName)} nhận lời. Lời mời hết hạn sau 30 giây.</p>
        <div class="countdown-big" data-expiry="${escapeHtml(match.expiresAt)}">30</div>
        <p class="countdown-label">giây</p>
      </article>`;
    matchTimer.textContent = '--:--';
    return;
  }

  if (match.status === 'accepted') {
    matchBody.innerHTML = `
      <article class="card center">
        <h2>Chuẩn bị nào!</h2>
        <p class="muted">Trận đấu bắt đầu sau</p>
        <div class="countdown-big" data-start="${escapeHtml(match.startedAt)}">5</div>
        <p class="countdown-label">giây</p>
      </article>`;
    matchTimer.textContent = formatDuration(match.durationSeconds);
    return;
  }

  if (match.status === 'in_progress') {
    if (match.isWaitingResult) {
      matchBody.innerHTML = '<article class="card center"><h2>Hết giờ! ⏳</h2><p class="muted">Đang tổng kết kết quả, con chờ một chút nhé…</p><div class="loading">Đang tổng kết</div></article>';
      matchTimer.textContent = '00:00';
      return;
    }

    if (feedback) {
      renderFeedbackCard();
      return;
    }

    if (!match.myQuestion) {
      matchBody.innerHTML = '<article class="card center"><h2>Đang tải câu hỏi…</h2><div class="loading">Chờ một chút</div></article>';
      return;
    }
    renderQuestionCard(match.myQuestion);
    return;
  }

  renderResult();
}

function renderQuestionCard(question) {
  selection = question.type === 'multiple_choice' ? [] : question.type === 'single_choice' ? null : question.type === 'true_false' ? null : '';
  matchBody.innerHTML = `
    <div class="progress" aria-hidden="true"><span id="match-bar"></span></div>
    <article class="card question-card">
      <span class="question-type">${TYPE_LABELS[question.type] ?? ''} · Câu ${match.myIndex + 1}</span>
      <h2 class="question-prompt" id="match-prompt"></h2>
      <div id="match-answer-area"></div>
      <div class="quiz-actions">
        <button class="btn" id="submit-answer" type="button">Trả lời</button>
      </div>
    </article>`;
  document.getElementById('match-prompt').textContent = question.prompt;
  document.getElementById('match-bar').style.width = '100%';
  const area = document.getElementById('match-answer-area');

  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    const list = document.createElement('div');
    list.className = 'options';
    for (const option of question.options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.dataset.key = option.key;
      button.innerHTML = `<span class="opt-key">${option.label}</span><span>${escapeHtml(option.text)}</span>`;
      button.addEventListener('click', () => {
        if (question.type === 'single_choice') selection = option.key;
        else selection = selection.includes(option.key)
          ? selection.filter((key) => key !== option.key)
          : [...selection, option.key];
        list.querySelectorAll('.option').forEach((node) => {
          const selected = Array.isArray(selection) ? selection.includes(node.dataset.key) : selection === node.dataset.key;
          node.classList.toggle('is-selected', selected);
        });
      });
      list.append(button);
    }
    area.append(list);
  } else if (question.type === 'true_false') {
    const row = document.createElement('div');
    row.className = 'tf-row';
    for (const [value, label] of [[true, '✅ Đúng'], [false, '❌ Sai']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      button.dataset.value = String(value);
      button.textContent = label;
      button.addEventListener('click', () => {
        selection = value;
        row.querySelectorAll('.option').forEach((node) => { node.className = 'option'; });
        button.className = 'option is-selected';
      });
      row.append(button);
    }
    area.append(row);
  } else {
    const row = document.createElement('div');
    row.className = 'fill-row';
    const input = document.createElement('input');
    input.className = 'input';
    input.type = 'text';
    input.placeholder = 'Con nhập câu trả lời…';
    input.maxLength = 200;
    input.addEventListener('input', () => { selection = input.value; });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); submitAnswer(); }
    });
    row.append(input);
    area.append(row);
  }

  document.getElementById('submit-answer').addEventListener('click', submitAnswer);
}

function buildAnswer(question) {
  if (question.type === 'single_choice') return selection ? { key: selection } : null;
  if (question.type === 'multiple_choice') return selection.length ? { keys: selection } : null;
  if (question.type === 'true_false') return typeof selection === 'boolean' ? { value: selection } : null;
  return String(selection ?? '').trim() ? { value: String(selection).trim() } : null;
}

async function submitAnswer() {
  if (busy || !match?.myQuestion) return;
  const question = match.myQuestion;
  const answer = buildAnswer(question);
  if (!answer) {
    toast(question.type === 'multiple_choice' ? 'Con chọn ít nhất một đáp án nhé!' : 'Con chọn hoặc nhập đáp án nhé!', 'error');
    return;
  }
  busy = true;
  const button = document.getElementById('submit-answer');
  if (button) { button.disabled = true; button.textContent = 'Đang gửi…'; }
  try {
    const payload = await api(`/api/v1/challenges/${match.id}/answers`, {
      method: 'POST',
      body: { index: match.myIndex, questionId: question.id, answer },
    });
    feedback = { ...payload.data.feedback, question };
    match = payload.data.state;
    renderMatch();
  } catch (error) {
    toast(error.message, 'error');
    if (button) { button.disabled = false; button.textContent = 'Trả lời'; }
    if (error.code === 'CHALLENGE_TIME_UP') refreshMatch();
  } finally {
    busy = false;
  }
}

function renderFeedbackCard() {
  const correct = feedback.isCorrect;
  matchBody.innerHTML = `
    <article class="card">
      <div class="feedback ${correct ? 'is-correct' : 'is-wrong'}" style="margin:0">
        <strong>${correct ? '✅ Đúng rồi! +1 điểm' : '❌ Chưa đúng rồi!'}</strong>
        <p style="margin:.2rem 0">Đáp án đúng: <b>${escapeHtml(answerText({ ...feedback.question, correctAnswer: feedback.correctAnswer }))}</b></p>
        <p style="margin:0">${escapeHtml(feedback.explanation ?? '')}</p>
      </div>
      <div class="quiz-actions">
        <button class="btn" id="next-challenge-question" type="button">Câu tiếp →</button>
      </div>
    </article>`;
  document.getElementById('next-challenge-question').addEventListener('click', () => {
    feedback = null;
    renderMatch();
  });
}

function renderResult() {
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
  matchTimer.textContent = '--:--';
  matchBody.innerHTML = `
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
    match = null;
    show('lobby');
    loadLobby();
  });
  if (match.status === 'finished') syncDiamondTotal();
}

async function refreshMatch() {
  if (!match) return;
  try {
    const payload = await api(`/api/v1/challenges/${match.id}`);
    match = payload.data;
    renderMatch();
  } catch (error) {
    if (error.status === 404) {
      match = null;
      show('lobby');
      loadLobby();
    }
  }
}

function startTicker() {
  setInterval(() => {
    if (!match) {
      document.querySelectorAll('[data-countdown]').forEach((node) => {
        const seconds = Math.max(0, Math.ceil((new Date(node.dataset.countdown).getTime() - Date.now()) / 1000));
        node.textContent = seconds > 0 ? `còn ${seconds}s` : 'đã hết hạn';
      });
      if (lobby && (lobby.incoming.length || lobby.outgoing.length)) {
        const expired = [...lobby.incoming, ...lobby.outgoing].some((item) => new Date(item.expiresAt) <= new Date());
        if (expired && Date.now() - lastAutoRefresh > 5000) {
          lastAutoRefresh = Date.now();
          loadLobby({ silent: true });
        }
      }
      return;
    }

    if (match.status === 'pending') {
      const node = matchBody.querySelector('[data-expiry]');
      const seconds = Math.max(0, Math.ceil((new Date(match.expiresAt).getTime() - Date.now()) / 1000));
      if (node) node.textContent = seconds;
      if (seconds === 0 && Date.now() - lastAutoRefresh > 2000) {
        lastAutoRefresh = Date.now();
        refreshMatch();
      }
      return;
    }

    if (match.status === 'accepted') {
      const node = matchBody.querySelector('[data-start]');
      const seconds = Math.max(0, Math.ceil((new Date(match.startedAt).getTime() - Date.now()) / 1000));
      if (node) node.textContent = seconds;
      if (seconds === 0 && Date.now() - lastAutoRefresh > 1500) {
        lastAutoRefresh = Date.now();
        refreshMatch();
      }
      return;
    }

    if (match.status === 'in_progress') {
      const seconds = Math.max(0, Math.ceil((new Date(match.endsAt).getTime() - Date.now()) / 1000));
      matchTimer.textContent = formatDuration(seconds);
      matchTimer.classList.toggle('is-urgent', seconds <= 60);
      if (seconds === 0 && Date.now() - lastAutoRefresh > 2500) {
        lastAutoRefresh = Date.now();
        refreshMatch();
      }
    }
  }, 500);
}

function startPolling() {
  setInterval(() => {
    if (!match || !['pending', 'accepted', 'in_progress'].includes(match.status)) return;
    if (document.hidden) return;
    if (feedback) return;
    if (Date.now() - lastAutoRefresh < 3000) return;
    lastAutoRefresh = Date.now();
    refreshMatch();
  }, 3000);
}

function setupSocket() {
  if (typeof window.io !== 'function') return;
  socket = window.io({ withCredentials: true });
  const onUpdate = (payload) => {
    if (!match) { loadLobby({ silent: true }); return; }
    if (payload?.challengeId === match.id) {
      if (match.status === 'in_progress' && !feedback) refreshMatch();
      else updateMatchHeader();
    } else if (match.status === 'in_progress') {
      refreshMatch();
    }
  };
  socket.on('challenge:invite', () => {
    toast('Con có lời mời thách đấu mới!', 'info');
    if (!match) loadLobby({ silent: true });
  });
  socket.on('challenge:updated', onUpdate);
  socket.on('challenge:finished', (payload) => {
    if (match && payload?.challengeId === match.id) refreshMatch();
    else if (!match) loadLobby({ silent: true });
  });
}

async function loadTopicsSafe() {
  try {
    await loadTopicOptions();
  } catch (error) {
    toast(error.message, 'error');
  }
}

document.getElementById('refresh-lobby').addEventListener('click', () => loadLobby());

document.getElementById('invite-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorBox = document.getElementById('invite-error');
  const button = document.getElementById('invite-button');
  errorBox.classList.add('hidden');
  const opponentUsername = document.getElementById('opponent-username').value.trim().toLowerCase();
  const topicId = document.getElementById('invite-topic').value;
  const durationSeconds = Number(document.getElementById('invite-duration').value);
  if (opponentUsername.length < 3) {
    errorBox.textContent = 'Con nhập tên đăng nhập của bạn (ít nhất 3 ký tự) nhé!';
    errorBox.classList.remove('hidden');
    return;
  }
  if (!topicId) {
    errorBox.textContent = 'Con chọn chủ đề thi đấu nhé!';
    errorBox.classList.remove('hidden');
    return;
  }
  button.disabled = true;
  button.textContent = 'Đang gửi…';
  try {
    const payload = await api('/api/v1/challenges/invites', {
      method: 'POST',
      body: { opponentUsername, topicId, durationSeconds },
    });
    document.getElementById('opponent-username').value = '';
    openMatch(payload.data.id);
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove('hidden');
  } finally {
    button.disabled = false;
    button.textContent = 'Gửi lời mời';
  }
});

document.getElementById('robot-levels').addEventListener('click', (event) => {
  const button = event.target.closest('[data-level]');
  if (!button) return;
  selectedLevel = button.dataset.level;
  document.querySelectorAll('[data-level]').forEach((node) => {
    node.setAttribute('aria-pressed', String(node.dataset.level === selectedLevel));
  });
});

document.getElementById('robot-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const topicId = document.getElementById('robot-topic').value;
  if (!topicId) return toast('Con chọn chủ đề nhé!', 'error');
  button.disabled = true;
  button.textContent = 'Đang gọi Robot…';
  try {
    const payload = await api('/api/v1/challenges/robot', {
      method: 'POST',
      body: {
        topicId,
        botLevel: selectedLevel,
        durationSeconds: Number(document.getElementById('robot-duration').value),
      },
    });
    openMatch(payload.data.id);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Thi với Robot';
  }
});

document.addEventListener('click', async (event) => {
  const accept = event.target.closest('[data-accept]');
  const decline = event.target.closest('[data-decline]');
  const cancel = event.target.closest('[data-cancel]');
  const open = event.target.closest('[data-open]');
  try {
    if (accept) {
      accept.disabled = true;
      await api(`/api/v1/challenges/${accept.dataset.accept}/accept`, { method: 'POST' });
      openMatch(accept.dataset.accept);
    } else if (decline) {
      decline.disabled = true;
      await api(`/api/v1/challenges/${decline.dataset.decline}/decline`, { method: 'POST' });
      loadLobby();
    } else if (cancel) {
      cancel.disabled = true;
      await api(`/api/v1/challenges/${cancel.dataset.cancel}/forfeit`, { method: 'POST' });
      loadLobby();
    } else if (open) {
      openMatch(open.dataset.open);
    }
  } catch (error) {
    toast(error.message, 'error');
    loadLobby();
  }
});

document.getElementById('forfeit-button').addEventListener('click', async () => {
  const yes = await confirmAction('Con chắc chắn muốn bỏ trận? Trận bỏ sẽ không nhận được kim cương.', {
    title: 'Bỏ trận',
    confirmText: 'Bỏ trận',
    danger: true,
  });
  if (!yes || !match) return;
  try {
    await api(`/api/v1/challenges/${match.id}/forfeit`, { method: 'POST' });
    refreshMatch();
  } catch (error) {
    toast(error.message, 'error');
  }
});

document.getElementById('leave-match').addEventListener('click', () => {
  match = null;
  feedback = null;
  show('lobby');
  loadLobby();
});

async function main() {
  profile = await initPage('student', 'challenge');
  await loadTopicsSafe();
  await loadLobby();
  show('lobby');
  setupSocket();
  startTicker();
  startPolling();
  const requested = new URLSearchParams(window.location.search).get('id');
  if (requested) openMatch(requested);
}

main().catch((error) => {
  incomingList.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
