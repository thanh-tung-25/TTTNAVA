import {api,el} from './api.js';
import {initPage} from './ui-core.js';
import {lessonContents} from './school-lesson-view.js';
const root=document.querySelector('#lesson-content'),notice=document.querySelector('#lesson-notice');
async function main(){
 const profile=await initPage('student','learning'),id=new URLSearchParams(location.search).get('id');
 if(!id)throw Error('Bạn chọn một bài học để bắt đầu nhé.');
 const {data}=await api('/api/v1/school-lessons/'+encodeURIComponent(id));
 document.title=(['tieng-anh','tieng-viet'].includes(data.subjectId)?data.chapterName+' · ':'')+data.name+' — TTNAVA';document.body.dataset.program=profile.course.kind;
 const back=el('a',{class:'btn btn-ghost',href:'/pages/student/practice/?subject='+encodeURIComponent(data.subjectId),text:'Danh sách bài học'});
 const reading=lessonContents(data),practice=el('section',{id:'lesson-practice',class:'lesson-practice'},[el('p',{class:'eyebrow',text:'THỬ SỨC VỚI KIẾN THỨC VỪA HỌC'}),el('h2',{text:'Luyện tập bài học'}),el('p',{text:'Trả lời từng câu, xem giải thích và theo dõi kết quả trong Bản đồ tiến bộ.'})]);
 const count=Math.min(10,data.questionCount),start=el('button',{class:'btn btn-primary',type:'button',text:count?'Bắt đầu · '+count+' câu':'Đang bổ sung câu hỏi'});start.disabled=!count;
 start.onclick=async()=>{start.disabled=true;notice.textContent='Đang mở bài luyện…';try{const {data:run}=await api('/api/v1/school-lessons/'+encodeURIComponent(id)+'/start',{method:'POST'});location.assign(run.href);}catch(error){notice.textContent=error.message;start.disabled=false;}};
 practice.append(start);reading.append(practice);
 const links=el('nav',{class:'lesson-neighbors','aria-label':'Chuyển bài học'});
 for(const [label,neighbor]of [['Bài trước',data.previous],['Bài tiếp theo',data.next]])if(neighbor)links.append(el('a',{class:'lesson-neighbor',href:'?id='+encodeURIComponent(neighbor.id)},[el('small',{text:label}),el('strong',{text:neighbor.name})]));
 root.replaceChildren(back,el('nav',{class:'lesson-jump','aria-label':'Các phần bài học'},[['Kiến thức','#lesson-theory'],['Ví dụ','#lesson-example'],['Luyện tập','#lesson-practice']].map(([text,href])=>el('a',{href,text}))),reading,links);notice.textContent='';
}
main().catch(error=>{notice.textContent=error.message;root.replaceChildren(el('a',{class:'btn',href:'/pages/student/learning/',text:'Về danh sách môn học'}));});
