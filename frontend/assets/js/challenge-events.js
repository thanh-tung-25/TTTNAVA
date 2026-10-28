import { api } from '/assets/js/api.js';
import { confirmAction, toast } from '/assets/js/ui.js';
import { store } from './challenge-context.js';
import { loadLobby } from './challenge-lobby.js';
import { openMatch, refreshMatch } from './challenge-match-actions.js';

function bindInviteForm() {
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
}

function bindRobot() {
  document.getElementById('robot-levels').addEventListener('click', (event) => {
    const button = event.target.closest('[data-level]');
    if (!button) return;
    store.selectedLevel = button.dataset.level;
    document.querySelectorAll('[data-level]').forEach((node) => {
      node.setAttribute('aria-pressed', String(node.dataset.level === store.selectedLevel));
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
          botLevel: store.selectedLevel,
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
}

function bindLobbyActions() {
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
}

function bindMatchActions() {
  document.getElementById('forfeit-button').addEventListener('click', async () => {
    const yes = await confirmAction('Con chắc chắn muốn bỏ trận? Trận bỏ sẽ không nhận được kim cương.', {
      title: 'Bỏ trận',
      confirmText: 'Bỏ trận',
      danger: true,
    });
    if (!yes || !store.match) return;
    try {
      await api(`/api/v1/challenges/${store.match.id}/forfeit`, { method: 'POST' });
      refreshMatch();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.getElementById('leave-match').addEventListener('click', () => {
    store.match = null;
    store.feedback = null;
    document.dispatchEvent(new CustomEvent('challenge:lobby'));
  });
}

export function bindChallengeEvents() {
  document.getElementById('refresh-lobby').addEventListener('click', () => loadLobby());
  bindInviteForm();
  bindRobot();
  bindLobbyActions();
  bindMatchActions();
}
