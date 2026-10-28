export const elements = {
  lobbyView: document.getElementById('lobby-view'),
  matchView: document.getElementById('match-view'),
  incomingList: document.getElementById('incoming-list'),
  outgoingList: document.getElementById('outgoing-list'),
  recentList: document.getElementById('recent-list'),
  activeBanner: document.getElementById('active-banner'),
  matchBody: document.getElementById('match-body'),
  matchTimer: document.getElementById('match-timer'),
  matchStatus: document.getElementById('match-status'),
  forfeitButton: document.getElementById('forfeit-button'),
};

export const store = {
  profile: null,
  topics: [],
  lobby: null,
  match: null,
  feedback: null,
  selection: null,
  busy: false,
  selectedLevel: 'easy',
  socket: null,
  lastAutoRefresh: 0,
};

export const STATUS_LABELS = {
  pending: 'Đang chờ bạn nhận lời',
  accepted: 'Chuẩn bị bắt đầu',
  in_progress: 'Đang thi đấu',
  finished: 'Đã kết thúc',
  cancelled: 'Đã huỷ',
  expired: 'Lời mời hết hạn',
};

export function remainingText(iso, prefix = 'còn') {
  if (!iso) return '';
  const seconds = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  return `${prefix} ${seconds}s`;
}

export function show(view) {
  elements.lobbyView.classList.toggle('hidden', view !== 'lobby');
  elements.matchView.classList.toggle('hidden', view !== 'match');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function requestRender() {
  document.dispatchEvent(new CustomEvent('challenge:render'));
}

export function requestLobby() {
  document.dispatchEvent(new CustomEvent('challenge:lobby'));
}
