import { api, escapeHtml, formatDate, formatPercent } from '/assets/js/api.js';
import { emptyState, initPage } from '/assets/js/ui.js';

const listEl = document.getElementById('history-list');
const tabsEl = document.getElementById('history-tabs');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');
const pageLabel = document.getElementById('page-label');

let tab = 'practice';
let page = 1;
let totalPages = 1;

function setTabButtons() {
  tabsEl.querySelectorAll('[data-tab]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  });
}

function practiceRow(item) {
  const percent = item.percent ?? formatPercent(item.correctCount, item.totalQuestions);
  const status = item.status === 'finished'
    ? `<span class="badge badge-success">${percent}%</span>`
    : '<span class="badge badge-warning">Đang làm</span>';
  return `
    <div class="history-item">
      <div class="history-main">
        <h3>${escapeHtml(item.topicName)}</h3>
        <p>${escapeHtml(item.subjectName)} · Lớp ${item.grade} · ${item.correctCount}/${item.totalQuestions} câu · 💎 ${item.diamonds}</p>
        <p>${formatDate(item.startedAt)}</p>
      </div>
      ${status}
    </div>`;
}

function examRow(item) {
  const submitted = item.status === 'submitted';
  return `
    <div class="history-item">
      <div class="history-main">
        <h3>${escapeHtml(item.topicName)}</h3>
        <p>${escapeHtml(item.subjectName)} · Lớp ${item.grade} · ${item.correctCount}/${item.totalQuestions} câu · 💎 ${item.diamonds}</p>
        <p>${formatDate(item.startedAt)}${item.submittedAt ? ` · Nộp ${formatDate(item.submittedAt)}` : ''}</p>
      </div>
      <div class="history-score">${submitted ? `${item.percent}%` : '—'}<small>${submitted ? 'điểm' : 'chưa nộp'}</small></div>
    </div>`;
}

async function load() {
  setTabButtons();
  listEl.innerHTML = '<div class="loading">Đang tải lịch sử…</div>';
  prevButton.disabled = true;
  nextButton.disabled = true;
  const endpoint = tab === 'practice' ? '/api/v1/practice/history' : '/api/v1/exams/history';
  try {
    const payload = await api(`${endpoint}?page=${page}&limit=10`);
    const items = payload.data;
    totalPages = Math.max(1, Math.ceil(payload.pagination.total / payload.pagination.limit));
    listEl.innerHTML = items.length
      ? items.map(tab === 'practice' ? practiceRow : examRow).join('')
      : emptyState('🌱', 'Chưa có hoạt động nào', tab === 'practice' ? 'Con thử luyện tập một chủ đề nhé!' : 'Con thử làm một bài thi nhé!');
    pageLabel.textContent = `Trang ${page}/${totalPages}`;
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  } catch (error) {
    listEl.innerHTML = emptyState('😿', 'Không tải được lịch sử', error.message);
  }
}

tabsEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tab]');
  if (!button) return;
  tab = button.dataset.tab;
  page = 1;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState(null, '', url);
  load();
});

prevButton.addEventListener('click', () => {
  if (page > 1) { page -= 1; load(); }
});

nextButton.addEventListener('click', () => {
  if (page < totalPages) { page += 1; load(); }
});

async function main() {
  await initPage('student', 'history');
  const value = new URLSearchParams(window.location.search).get('tab');
  tab = value === 'exam' ? 'exam' : 'practice';
  page = 1;
  await load();
}

main().catch((error) => {
  listEl.innerHTML = emptyState('😿', 'Không tải được trang', error.message);
});
