import { escapeHtml, formatDate } from './api.js';

export function configureChineseHome() {
  document.querySelector('.hero-mascot').src = '/assets/images/mascot-panda.svg';
  document.querySelector('#recent-activity').previousElementSibling.querySelector('a').href = '/pages/student/chinese/?view=history';
}

export function chineseActivityRow(item) {
  const finished = Boolean(item.finished_at);
  const title = item.test_id ? 'Bài kiểm tra Tiếng Trung' : 'Quiz Tiếng Trung';
  return `<a class="history-item chinese-activity" href="/pages/student/chinese/?attempt=${encodeURIComponent(item.id)}">
    <img src="/assets/images/mascot-${finished ? 'panda' : 'bunny'}.svg" width="44" height="48" alt="">
    <div class="history-main"><h3>${title}</h3><p>${escapeHtml(formatDate(item.started_at))}</p></div>
    <span class="badge ${finished ? 'badge-success' : 'badge-warning'}">${finished ? `${escapeHtml(item.score)}/100` : 'Tiếp tục'}</span>
  </a>`;
}
