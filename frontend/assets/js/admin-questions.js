import { emptyState, initPage } from '/assets/js/ui.js';
import {
  changeStatus,
  loadQuestions,
  openCreate,
  openDetail,
} from './admin-questions-actions.js';
import { openImport } from './admin-questions-import.js';
import { elements, store } from './admin-questions-context.js';
import {
  bindTree,
  loadTree,
  setOnSelect,
  showGuidance,
} from './admin-questions-tree.js';

setOnSelect(() => {
  loadQuestions();
});

elements.table.addEventListener('click', (event) => {
  const view = event.target.closest('[data-view]');
  const publish = event.target.closest('[data-publish]');
  const hide = event.target.closest('[data-hide]');
  const retry = event.target.closest('[data-retry-questions]');
  if (view) openDetail(view.dataset.view);
  else if (publish) changeStatus(publish.dataset.publish, 'published');
  else if (hide) changeStatus(hide.dataset.hide, 'hidden');
  else if (retry) loadQuestions();
});

elements.tree.addEventListener('click', (event) => {
  if (event.target.closest('[data-tree-retry]')) loadTree().catch(() => {});
});

document.getElementById('create-question').addEventListener('click', openCreate);
document.getElementById('import-questions').addEventListener('click', openImport);
document.getElementById('filter-button').addEventListener('click', () => {
  store.page = 1;
  loadQuestions();
});
document.getElementById('refresh-questions').addEventListener('click', () => {
  store.page = 1;
  loadQuestions();
});
document.getElementById('filter-q').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    store.page = 1;
    loadQuestions();
  }
});
elements.treeRefresh.addEventListener('click', () => loadTree().catch(() => {}));
elements.treeYear.addEventListener('change', () => {
  store.selectedScope = null;
  store.page = 1;
  showGuidance();
  loadTree(elements.treeYear.value).catch(() => {});
});
elements.prevButton.addEventListener('click', () => {
  if (store.page > 1) {
    store.page -= 1;
    loadQuestions();
  }
});
elements.nextButton.addEventListener('click', () => {
  if (store.page < store.totalPages) {
    store.page += 1;
    loadQuestions();
  }
});

async function main() {
  await initPage('admin', 'questions');
  bindTree();
  await loadTree();
}

main().catch((error) => {
  elements.table.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
