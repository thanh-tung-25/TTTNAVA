import { formatDuration } from '/assets/js/api.js';
import { toast } from '/assets/js/ui.js';
import { elements, store } from './challenge-context.js';
import { loadLobby } from './challenge-lobby.js';
import { refreshMatch } from './challenge-match-actions.js';

export function startTicker() {
  setInterval(() => {
    const match = store.match;
    if (!match) {
      document.querySelectorAll('[data-countdown]').forEach((node) => {
        const seconds = Math.max(0, Math.ceil((new Date(node.dataset.countdown).getTime() - Date.now()) / 1000));
        node.textContent = seconds > 0 ? `còn ${seconds}s` : 'đã hết hạn';
      });
      if (store.lobby && (store.lobby.incoming.length || store.lobby.outgoing.length)) {
        const expired = [...store.lobby.incoming, ...store.lobby.outgoing]
          .some((item) => new Date(item.expiresAt) <= new Date());
        if (expired && Date.now() - store.lastAutoRefresh > 5000) {
          store.lastAutoRefresh = Date.now();
          loadLobby();
        }
      }
      return;
    }

    if (match.status === 'pending') {
      const node = elements.matchBody.querySelector('[data-expiry]');
      const seconds = Math.max(0, Math.ceil((new Date(match.expiresAt).getTime() - Date.now()) / 1000));
      if (node) node.textContent = seconds;
      if (seconds === 0 && Date.now() - store.lastAutoRefresh > 2000) {
        store.lastAutoRefresh = Date.now();
        refreshMatch();
      }
      return;
    }

    if (match.status === 'accepted') {
      const node = elements.matchBody.querySelector('[data-start]');
      const seconds = Math.max(0, Math.ceil((new Date(match.startedAt).getTime() - Date.now()) / 1000));
      if (node) node.textContent = seconds;
      if (seconds === 0 && Date.now() - store.lastAutoRefresh > 1500) {
        store.lastAutoRefresh = Date.now();
        refreshMatch();
      }
      return;
    }

    if (match.status === 'in_progress') {
      const seconds = Math.max(0, Math.ceil((new Date(match.endsAt).getTime() - Date.now()) / 1000));
      elements.matchTimer.textContent = formatDuration(seconds);
      elements.matchTimer.classList.toggle('is-urgent', seconds <= 60);
      if (seconds === 0 && Date.now() - store.lastAutoRefresh > 2500) {
        store.lastAutoRefresh = Date.now();
        refreshMatch();
      }
    }
  }, 500);
}

export function startPolling() {
  setInterval(() => {
    if (!store.match || !['pending', 'accepted', 'in_progress'].includes(store.match.status)) return;
    if (document.hidden) return;
    if (Date.now() - store.lastAutoRefresh < 3000) return;
    store.lastAutoRefresh = Date.now();
    refreshMatch();
  }, 3000);
}

export function setupSocket() {
  if (typeof window.io !== 'function') return;
  store.socket = window.io({ withCredentials: true });
  const onUpdate = (payload) => {
    if (!store.match) { loadLobby(); return; }
    if (payload?.challengeId === store.match.id) {
      if (!store.feedback) refreshMatch();
      else refreshMatch();
    } else if (store.match.status === 'in_progress') {
      refreshMatch();
    }
  };
  store.socket.on('challenge:invite', () => {
    toast('Con có lời mời thách đấu mới!', 'info');
    if (!store.match) loadLobby();
  });
  store.socket.on('challenge:updated', onUpdate);
  store.socket.on('challenge:finished', (payload) => {
    if (store.match && payload?.challengeId === store.match.id) refreshMatch();
    else if (!store.match) loadLobby();
  });
}
