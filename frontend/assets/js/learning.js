import { el } from './api.js';
import { initPage } from './ui-core.js';

function subjectCard({ title, text, href, animal, symbol, tone }) {
  return el('a', { class: 'learning-subject '+tone, href }, [
    el('div', { class:'learning-subject-art' }, [el('img', { src:'/assets/images/mascot-'+animal+'.svg', width:94, height:102, alt:'' }), el('span', {class:'learning-symbol', 'aria-hidden':'true', text:symbol})]),
    el('div', {}, [el('h3', {text:title}), el('p', {text})]),
    el('span', {class:'learning-start', text:'Vào học →'}),
  ]);
}
function toolCard([title, text, href, symbol]) {
  return el('a', {class:'learning-tool', href}, [el('span', {class:'learning-tool-icon', 'aria-hidden':'true', text:symbol}), el('div', {}, [el('h3',{text:title}),el('p',{text})]),el('span',{'aria-hidden':'true',text:'→'})]);
}
async function load() {
  const profile = await initPage('student', 'learning');
  const chinese = profile.course?.kind === 'chinese';
  const title = profile.course?.title || (chinese ? 'Tiếng Trung HSK '+profile.course.level : 'Lớp '+profile.grade);
  document.getElementById('learning-course').textContent = title;
  document.getElementById('learning-description').textContent = chinese ? 'Học từ mới, ôn thẻ và tự tin chinh phục tiếng Trung.' : 'Toán, Tiếng Việt và Tiếng Anh — cùng khám phá từng bài học.';
  document.getElementById('learning-mascot').src = '/assets/images/mascot-'+(chinese?'panda':'owl')+'.svg';
  const subjects = chinese ? [
    {title:'Bài học HSK '+profile.course.level,text:'Khám phá bài học và học bằng thẻ lật.',href:'/pages/student/chinese/',animal:'panda',symbol:'文',tone:'learning-purple'},
    {title:'Sổ từ của con',text:'Ôn từ đã học, từ yêu thích và từ cần nhớ.',href:'/pages/student/chinese/?view=notebook',animal:'bunny',symbol:'Aa',tone:'learning-peach'},
  ] : [
    {title:'Toán',text:'Khám phá con số, phép tính và hình học.',href:'/pages/student/practice/?subject=toan',animal:'owl',symbol:'＋',tone:'learning-purple'},
    {title:'Tiếng Việt',text:'Cùng đọc hiểu, luyện từ và đặt câu.',href:'/pages/student/practice/?subject=tieng-viet',animal:'bunny',symbol:'Aa',tone:'learning-peach'},
    {title:'Tiếng Anh',text:'Học từ vựng và những mẫu câu mới.',href:'/pages/student/practice/?subject=tieng-anh',animal:'panda',symbol:'Abc',tone:'learning-mint'},
  ];
  if (chinese) {
    document.getElementById('learning-subjects-title').textContent = 'Cùng học Tiếng Trung';
    document.getElementById('learning-subjects-hint').textContent = 'Nội dung thuộc khóa '+title+' của con.';
    document.getElementById('learning-tools-title').textContent = 'Kiểm tra và theo dõi tiến bộ';
  }
  document.getElementById('learning-subjects').replaceChildren(...subjects.map(subjectCard));
  const tools = chinese ? [
    ['Bài kiểm tra','Thử sức với bài kiểm tra của lớp.','/pages/student/chinese/?view=tests','◷'],
    ['Kết quả học tập','Tiếp tục bài làm và xem lại kết quả.','/pages/student/chinese/?view=history','★'],
  ] : [
    ['Bài tập tương tác','Điền số, nối cặp, sắp xếp và tự luận.','/pages/student/worksheets/','▦'],
    ['Luyện tập','Chọn bài học, làm bài và xem lời giải.','/pages/student/practice/','✎'],
    ['Thi thử','Kiểm tra chủ đề, học kì hoặc cả năm.','/pages/student/exam/','◷'],
    ['Thách đấu','Cùng bạn bè hoặc thử sức với Robot.','/pages/student/challenge/','⚑'],
  ];
  document.getElementById('learning-tools').replaceChildren(...tools.map(toolCard));
}
load().catch(error => {
  document.getElementById('learning-subjects').replaceChildren();
  const notice = document.getElementById('learning-notice');
  notice.textContent = error.message;
  notice.classList.remove('hidden');
});
