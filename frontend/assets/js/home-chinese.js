import { escapeHtml, formatDate } from './api.js';

export function configureChineseHome() {
  document.getElementById('subjects-heading').textContent = 'Hôm nay mình học Tiếng Trung nhé!';
  const subjects = [
    ['', '文', 'Bài học HSK', 'Khám phá từ mới và thẻ lật', 'Vào học'],
    ['?view=notebook', '✎', 'Sổ từ của con', 'Ôn từ đã học và từ yêu thích', 'Ôn từ'],
    ['?view=tests', '◷', 'Kiểm tra', 'Thử sức với bài kiểm tra của lớp', 'Khám phá'],
    ['?view=history', '★', 'Kết quả học tập', 'Xem lại những lần mình đã cố gắng', 'Xem kết quả'],
  ];
  const colors = ['', 'subject-toan', 'subject-tieng-viet', 'subject-tieng-anh'];
  document.querySelector('.subject-grid').innerHTML = subjects.map(([query, icon, title, text, cta], index) => `
    <a class="subject-card ${colors[index]}" href="/pages/student/chinese/${query}">
      <span class="subject-icon" aria-hidden="true">${icon}</span>
      <div><h3>${title}</h3><p>${text}</p></div>
      <span class="subject-bottom">${cta} <b aria-hidden="true">→</b></span>
    </a>`).join('');
  document.getElementById('modes-heading').textContent = 'Góc học của con';
  document.querySelector('.home-modes').innerHTML = [
    ['?view=notebook&filter=due', '↺', 'Từ đến hạn ôn', 'Nhắc lại một chút để nhớ lâu hơn'],
    ['?view=notebook&filter=favorite', '♡', 'Từ yêu thích', 'Những từ con muốn ghi nhớ'],
    ['?view=history', '◷', 'Tiếp tục bài làm', 'Mở lại quiz đang học và xem kết quả'],
  ].map(([query, icon, title, text], index) => `<a class="home-mode animal-mode" href="/pages/student/chinese/${query}"><img src="/assets/images/mascot-${['owl','bunny','panda'][index]}.svg" width="64" height="68" alt=""><div><h3>${title}</h3><p>${text}</p></div><span class="mode-arrow" aria-hidden="true">→</span></a>`).join('');
  document.querySelectorAll('.home-bottom .card-head h2').forEach((heading, index) => {
    const image = document.createElement('img');
    image.src = '/assets/images/mascot-'+(index ? 'bunny' : 'panda')+'.svg';
    image.alt = '';image.width = 52;image.height = 56;heading.prepend(image);
  });
  document.querySelector('#recent-activity').previousElementSibling.querySelector('a').href = '/pages/student/chinese/?view=history';
  const mascot = document.querySelector('.hero-mascot');
  mascot.src = '/assets/images/mascot-panda.svg';
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
