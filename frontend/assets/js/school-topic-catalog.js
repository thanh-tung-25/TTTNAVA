import {escapeHtml} from './api.js';
import {animalPath} from './animal-path.js';
import {semesterName} from './primary-subjects.js';

function topicCard(topic,index,subjectId){
 const practiceReady=topic.questionCount>=10,ready=practiceReady||topic.hasMaterial;
 const prefix=topic.chapterName+' · ',title=topic.hasMaterial&&topic.name.startsWith(prefix)?topic.name.slice(prefix.length):topic.name;
 return `<article class="topic-item${ready?'':' topic-not-ready'}">
  <div class="practice-topic-mascot" aria-hidden="true"><img src="/assets/images/mascot-${subjectId==='toan'?'lion':subjectId==='tieng-viet'?'bunny':'panda'}.svg" width="54" height="58" alt=""><span class="topic-index">${index+1}</span></div>
  <div class="practice-topic-info"><h3>${escapeHtml(title)}</h3><p>${topic.questionCount} câu hỏi · Lớp ${topic.grade}${topic.hasMaterial?' · Lý thuyết và ví dụ':ready?'':' · Đang chuẩn bị thêm câu'}</p></div>
  ${topic.hasMaterial?`<a class="btn btn-sm practice-topic-start" href="/pages/student/lesson/?id=${encodeURIComponent(topic.lessonId)}">Học bài</a>`:`<button class="btn btn-sm practice-topic-start" type="button" data-topic="${escapeHtml(topic.id)}" aria-label="${ready?'Học ngay':'Chưa đủ câu'}: ${escapeHtml(topic.name)}"${ready?'':' disabled'}>${ready?'Học ngay':'Chưa đủ câu'}</button>`}
 </article>`;
}

export function renderSchoolTopics(root,topics,profile,subjectId){
 root.classList.remove('animal-path');
 const secondary=['secondary','highschool'].includes(profile.course?.kind)&&topics.some(t=>t.chapterId&&t.semester);
 root.classList.toggle('secondary-topic-catalog',secondary);
 const warning=topics.every(t=>t.questionCount===0&&!t.hasMaterial)?`<div class="empty">${secondary?'Môn này chưa có câu hỏi nào được đăng. Các bài học đã sẵn sàng để giáo viên bổ sung câu hỏi.':'Môn này chưa có câu hỏi nào được đăng. Con chờ cô giáo duyệt câu hỏi nhé!'}</div>`:'';
 if(!secondary){
  root.innerHTML=warning+topics.map((topic,index)=>topicCard(topic,index,subjectId)).join('');
  animalPath(root,{selector:':scope > .topic-item',title:'Học từng bài',hint:'Mỗi nhóm có tối đa 4 bài. Chọn bài con đang học trên lớp.'});
  return;
 }
 let semester='',chapterId='';
 const english=subjectId==='tieng-anh';
 const semesterLabel=profile.course?.kind==='highschool'?'Học kì / Cả năm':english?'Học kì':'Tập sách';
 const semesterNames=english?['Cả năm','Học kì 1','Học kì 2']:['Cả hai tập','Tập 1 · Học kì 1','Tập 2 · Học kì 2'];
 const chapterLabel=subjectId==='tieng-viet'?'Bài học':subjectId==='tieng-anh'?'Unit / Review':'Chương';
 const allChapters=subjectId==='tieng-viet'?'Tất cả bài học':subjectId==='tieng-anh'?'Tất cả Unit / Review':'Tất cả chương';
 function draw(){
  const available=topics.filter(t=>!semester||t.semester===semester),chapters=new Map();
  for(const topic of available)if(!chapters.has(topic.chapterId))chapters.set(topic.chapterId,topic);
  if(chapterId&&!chapters.has(chapterId))chapterId='';
  const filtered=available.filter(t=>!chapterId||t.chapterId===chapterId);
  let previous='',cards='';
  for(const [index,topic]of filtered.entries()){
   if(previous!==topic.chapterId){
    previous=topic.chapterId;
    cards+=`<header class="school-chapter-heading" data-secondary-chapter="${escapeHtml(topic.chapterId)}"><p>${topic.semester==='year'?semesterName('year'):topic.semester==='hk1'?semesterNames[1]:semesterNames[2]}</p><h2>${escapeHtml(topic.chapterName)}</h2>${topic.bookLabel?`<p>${escapeHtml(topic.bookLabel)}</p>`:''}</header>`;
   }
   cards+=topicCard(topic,index,subjectId);
  }
  root.innerHTML=`<div class="school-catalog-filters">
   <label class="field"><span>${semesterLabel}</span><select class="select" id="secondary-volume" aria-label="${semesterLabel}"><option value="">Tất cả</option>${['hk1','hk2','year'].filter(id=>topics.some(t=>t.semester===id)).map(id=>`<option value="${id}"${semester===id?' selected':''}>${id==='year'?'Cả năm':id==='hk1'?semesterNames[1]:semesterNames[2]}</option>`).join('')}</select></label>
   <label class="field"><span>${chapterLabel}</span><select class="select" id="secondary-chapter" aria-label="${chapterLabel}"><option value="">${allChapters}</option>${[...chapters].map(([id,t])=>`<option value="${escapeHtml(id)}"${id===chapterId?' selected':''}>${escapeHtml(t.chapterName)}</option>`).join('')}</select></label>
  </div>${warning}${cards||'<div class="empty">Chưa có bài học trong phạm vi đã chọn.</div>'}`;
  root.querySelector('#secondary-volume').onchange=event=>{semester=event.target.value;chapterId='';draw();};
  root.querySelector('#secondary-chapter').onchange=event=>{chapterId=event.target.value;draw();};
 }
 draw();
}
