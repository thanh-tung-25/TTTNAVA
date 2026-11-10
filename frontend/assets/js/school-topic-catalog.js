import {escapeHtml} from './api.js';
import {animalPath} from './animal-path.js';

function topicCard(topic,index,subjectId){
 const ready=topic.questionCount>=10;
 return `<article class="topic-item${ready?'':' topic-not-ready'}">
  <div class="practice-topic-mascot" aria-hidden="true"><img src="/assets/images/mascot-${subjectId==='toan'?'owl':subjectId==='tieng-viet'?'bunny':'panda'}.svg" width="54" height="58" alt=""><span class="topic-index">${index+1}</span></div>
  <div class="practice-topic-info"><h3>${escapeHtml(topic.name)}</h3><p>${topic.questionCount} câu hỏi · Lớp ${topic.grade}${ready?'':' · Đang chuẩn bị thêm câu'}</p></div>
  <button class="btn btn-sm practice-topic-start" type="button" data-topic="${escapeHtml(topic.id)}" aria-label="${ready?'Học ngay':'Chưa đủ câu'}: ${escapeHtml(topic.name)}"${ready?'':' disabled'}>${ready?'Học ngay':'Chưa đủ câu'}</button>
 </article>`;
}

export function renderSchoolTopics(root,topics,profile,subjectId){
 root.classList.remove('animal-path');
 const secondary=profile.course?.kind==='secondary'&&topics.some(t=>t.chapterId&&t.semester);
 root.classList.toggle('secondary-topic-catalog',secondary);
 const warning=topics.every(t=>t.questionCount===0)?`<div class="empty">${secondary?'Môn này chưa có câu hỏi nào được đăng. Các bài học đã sẵn sàng để giáo viên bổ sung câu hỏi.':'Môn này chưa có câu hỏi nào được đăng. Con chờ cô giáo duyệt câu hỏi nhé!'}</div>`:'';
 if(!secondary){
  root.innerHTML=warning+topics.map((topic,index)=>topicCard(topic,index,subjectId)).join('');
  animalPath(root,{selector:':scope > .topic-item',title:'Học từng bài',hint:'Mỗi nhóm có tối đa 4 bài. Chọn bài con đang học trên lớp.'});
  return;
 }
 let semester='',chapterId='';
 const english=subjectId==='tieng-anh';
 const semesterLabel=english?'Học kì':'Tập sách';
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
    cards+=`<header class="school-chapter-heading" data-secondary-chapter="${escapeHtml(topic.chapterId)}"><p>${topic.semester==='hk1'?semesterNames[1]:semesterNames[2]}</p><h2>${escapeHtml(topic.chapterName)}</h2>${topic.bookLabel?`<p>${escapeHtml(topic.bookLabel)}</p>`:''}</header>`;
   }
   cards+=topicCard(topic,index,subjectId);
  }
  root.innerHTML=`<div class="school-catalog-filters">
   <label class="field"><span>${semesterLabel}</span><select class="select" id="secondary-volume" aria-label="${semesterLabel}"><option value="">${semesterNames[0]}</option><option value="hk1"${semester==='hk1'?' selected':''}>${semesterNames[1]}</option><option value="hk2"${semester==='hk2'?' selected':''}>${semesterNames[2]}</option></select></label>
   <label class="field"><span>${chapterLabel}</span><select class="select" id="secondary-chapter" aria-label="${chapterLabel}"><option value="">${allChapters}</option>${[...chapters].map(([id,t])=>`<option value="${escapeHtml(id)}"${id===chapterId?' selected':''}>${escapeHtml(t.chapterName)}</option>`).join('')}</select></label>
  </div>${warning}${cards||'<div class="empty">Chưa có bài học trong phạm vi đã chọn.</div>'}`;
  root.querySelector('#secondary-volume').onchange=event=>{semester=event.target.value;chapterId='';draw();};
  root.querySelector('#secondary-chapter').onchange=event=>{chapterId=event.target.value;draw();};
 }
 draw();
}
