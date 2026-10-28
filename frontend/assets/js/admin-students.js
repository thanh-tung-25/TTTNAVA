import { emptyState, initPage } from '/assets/js/ui.js';
import { elements, store } from './admin-students-context.js';
import { load, toggleLock } from './admin-students-load.js';
import { openCreate, openEdit, openPassword } from './admin-students-modals.js';

elements.table.addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]');
  const password = event.target.closest('[data-password]');
  const lock = event.target.closest('[data-lock]');
  if (edit) openEdit(edit.dataset.edit);
  else if (password) openPassword(password.dataset.password);
  else if (lock) {
    const name = lock.closest('tr').querySelector('strong')?.textContent ?? 'học sinh';
    toggleLock(lock.dataset.lock, lock.dataset.locked === 'true', name);
  }
});

document.getElementById('create-button').addEventListener('click', openCreate);
document.getElementById('search-button').addEventListener('click', () => {
  store.search = elements.searchInput.value.trim();
  store.page = 1;
  load();
});
elements.searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    store.search = elements.searchInput.value.trim();
    store.page = 1;
    load();
  }
});
elements.prevButton.addEventListener('click', () => {
  if (store.page > 1) {
    store.page -= 1;
    load();
  }
});
elements.nextButton.addEventListener('click', () => {
  if (store.page < store.totalPages) {
    store.page += 1;
    load();
  }
});

async function main() {
  await initPage('admin', 'students');
  await load();
}

main().catch((error) => {
  elements.table.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
