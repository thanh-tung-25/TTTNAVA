import { escapeHtml } from '/assets/js/api.js';
import { initPage } from '/assets/js/ui.js';
import { startExam, submitExam } from './exam-actions.js';
import { elements, show, store } from './exam-context.js';
import {schoolNavigationSubject,syncSchoolNavigationSubject} from './school-navigation-subject.js';
import { loadTopics, renderPalette, renderQuestion } from './exam-render.js';
import { flushSave } from './exam-save.js';
import {renderExamCatalog} from './exam-catalog-view.js';
import {api} from './api.js';
import {renderResult} from './exam-result.js';
import {startTicker} from './exam-actions.js';

document.getElementById('prev-button').addEventListener('click', async () => {
  await flushSave();
  if (store.current > 0) { store.current -= 1; renderQuestion(); }
});

document.getElementById('next-button').addEventListener('click', async () => {
  await flushSave();
  if (store.current + 1 < store.attempt.questions.length) { store.current += 1; renderQuestion(); }
});

document.getElementById('submit-button').addEventListener('click', () => submitExam(false));
document.addEventListener('exam:auto-submit', () => submitExam(true));
document.addEventListener('exam:palette', renderPalette);

elements.palette.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  await flushSave();
  store.current = Number(button.dataset.index);
  renderQuestion();
});

elements.subjectTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-subject]');
  if (!button) return;
  store.subjectId = button.dataset.subject;
  syncSchoolNavigationSubject(store.subjectId,store.profile);
  const url = new URL(window.location.href);
  url.searchParams.set('subject', store.subjectId);
  window.history.replaceState(null, '', url);
  loadTopics();
});

elements.topicList.addEventListener('click', (event) => {
  const scoped=event.target.closest('[data-exam-kind]');
  if(scoped){startExam({mode:scoped.dataset.examKind,subjectId:store.subjectId,yearId:store.catalog.year.id,...(scoped.dataset.chapter?{chapterId:scoped.dataset.chapter}:{}),...(scoped.dataset.semester?{semester:scoped.dataset.semester}:{})},scoped);return;}
  const button = event.target.closest('[data-topic]');
  if (button) startExam(button.dataset.topic, button);
});
document.querySelectorAll('[data-exam-mode]').forEach(button=>button.onclick=()=>{
 store.mode=button.dataset.examMode;if(store.mode==='semester'&&store.semester==='all')store.semester='hk1';renderExamCatalog();
});
document.querySelector('#exam-semester').onchange=event=>{store.semester=event.target.value;renderExamCatalog();};

window.addEventListener('beforeunload', (event) => {
  if (store.attempt?.status === 'in_progress' && !store.attempt.submitted) {
    event.preventDefault();
    event.returnValue = '';
  }
});

async function main() {
  const papers=new URLSearchParams(location.search).get('view')==='papers';
  store.profile = await initPage('student', papers?'papers':'exam');
  document.body.dataset.examCatalog=papers?'papers':'checks';
  if(papers){document.title='Đề thi — TTNAVA';document.querySelector('.practice-welcome h1').textContent='Đề thi của lớp bạn';document.querySelector('.practice-welcome p:last-child').textContent='Chọn môn học, đợt thi và bộ đề giáo viên đã đăng.';document.querySelector('.practice-welcome .eyebrow').firstChild.textContent='ĐỀ THI ';document.querySelector('.assessment-modes').hidden=true;document.querySelector('.assessment-help').textContent='Mỗi đề có thời gian, cấu trúc và đáp án do giáo viên thiết lập. Kết quả được chấm sau khi nộp bài.';}
  if (store.profile.grade === null) {
    window.location.replace('/pages/student/chinese/?view=tests');
    return;
  }
  store.subjectId = schoolNavigationSubject(store.profile);syncSchoolNavigationSubject(store.subjectId,store.profile);
  const requested=new URLSearchParams(location.search).get('attempt');
  if(requested){
    store.attempt=(await api('/api/v1/exams/'+encodeURIComponent(requested))).data;
    if(store.attempt.submitted)renderResult();
    else{store.current=0;store.deadline=Date.now()+store.attempt.remainingSeconds*1000;store.graceDeadline=store.deadline+5000;show(elements.examView);renderQuestion();startTicker();}
    return;
  }
  await loadTopics();
  show(elements.setupView);
}

main().catch((error) => {
  elements.topicList.innerHTML = `<div class="empty">😿 ${escapeHtml(error.message)}</div>`;
});
