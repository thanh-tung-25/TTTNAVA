import { emptyState, initPage } from '/assets/js/ui.js';
import { elements, show, store } from './challenge-context.js';
import { bindChallengeEvents } from './challenge-events.js';
import { loadLobby, loadTopicOptions } from './challenge-lobby.js';
import { openMatch } from './challenge-match-actions.js';
import { renderMatch } from './challenge-match-view.js';
import { setupSocket, startPolling, startTicker } from './challenge-realtime.js';

async function main() {
  store.profile = await initPage('student', 'challenge');
  bindChallengeEvents();
  document.addEventListener('challenge:render', renderMatch);
  document.addEventListener('challenge:lobby', () => {
    show('lobby');
    loadLobby();
  });
  await loadTopicOptions();
  await loadLobby();
  show('lobby');
  setupSocket();
  startTicker();
  startPolling();
  const requested = new URLSearchParams(window.location.search).get('id');
  if (requested) openMatch(requested);
}

main().catch((error) => {
  elements.incomingList.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
