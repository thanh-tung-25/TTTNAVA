import {api,escapeHtml} from './api.js';
import {elements,store} from './exam-context.js';
let request=0;
export function renderExamCatalog(){
 const catalog=store.catalog;if(!catalog)return;
 document.querySelectorAll('[data-exam-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.examMode===store.mode)));
 const filter=document.querySelector('#exam-semester-filter');filter.hidden=store.mode==='annual';
 const select=document.querySelector('#exam-semester');select.querySelector('[value=all]').disabled=store.mode==='semester';select.value=store.semester;
 const label=document.querySelector('#exam-list-heading');label.textContent=store.mode==='chapter'?'Chọn chủ đề con muốn kiểm tra':store.mode==='semester'?'Đề thi theo học kì':'Thử sức với kiến thức cả năm';
 let entries;
 if(store.mode==='chapter')entries=catalog.chapters.filter(c=>store.semester==='all'||c.semester===store.semester).map(c=>({...c,title:c.name,description:(c.semester==='hk1'?'Học kì 1':'Học kì 2')+' · Gồm các bài trong chủ đề',chapterId:c.id}));
 else if(store.mode==='semester')entries=catalog.semesters.filter(s=>s.id===store.semester).map(s=>({...s,title:'Đề thi thử '+s.name.toLowerCase(),description:'Lấy câu hỏi từ các chủ đề của '+s.name.toLowerCase(),semester:s.id}));
 else entries=[{...catalog.annual,title:'Đề thi thử cả năm',description:'Kiến thức cả học kì 1 và học kì 2'}];
 elements.topicList.innerHTML=entries.length?entries.map((entry,index)=>{
  const ready=entry.questionCount>=entry.count;
  return `<article class="topic-item assessment-topic${ready?'':' topic-not-ready'}"><div class="practice-topic-mascot" aria-hidden="true"><img src="/assets/images/mascot-${store.mode==='chapter'?'owl':store.mode==='semester'?'bunny':'panda'}.svg" width="54" height="58" alt=""><span class="topic-index">${index+1}</span></div><div class="practice-topic-info"><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.description)}</p><div class="assessment-tags"><span>${entry.count} câu ngẫu nhiên</span><span>${entry.durationSeconds/60} phút</span></div><p class="assessment-pool">Có ${entry.questionCount} câu trong phạm vi${ready?'':' · Đang chuẩn bị thêm câu hỏi'}</p></div><button class="btn btn-sm practice-topic-start" type="button" data-exam-kind="${store.mode}"${entry.chapterId?' data-chapter="'+escapeHtml(entry.chapterId)+'"':''}${entry.semester?' data-semester="'+entry.semester+'"':''}${ready?'':' disabled'}>${ready?'Bắt đầu':'Chưa đủ câu'}</button></article>`;
 }).join(''):'<div class="empty">Chưa có chủ đề trong học kì này. Con thử chọn môn hoặc học kì khác nhé.</div>';
}
export async function loadExamCatalog(){
 const current=++request;elements.topicList.innerHTML='<div class="loading">Đang chuẩn bị danh sách đề…</div>';
 try{const {data}=await api('/api/v1/exams/catalog?subjectId='+encodeURIComponent(store.subjectId));if(current!==request)return;store.catalog=data;document.querySelector('#exam-grade').textContent='· LỚP '+store.profile.grade;renderExamCatalog();}
 catch(e){if(current===request)elements.topicList.innerHTML='<div class="empty">'+escapeHtml(e.message)+'</div>';}
}
