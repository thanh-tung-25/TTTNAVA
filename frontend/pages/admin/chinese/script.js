import {initPage} from '/assets/js/ui-core.js';
import {request,el,root,card,field,notice,error,table} from '/assets/js/chinese-common.js';
import {adminCatalog} from '/assets/js/chinese-admin-catalog.js';
import {adminLessonWorkspace} from '/assets/js/chinese-admin-workspace.js';
import {adminSetEditor} from '/assets/js/chinese-admin-editor.js';
const params=new URLSearchParams(location.search);let catalog;
async function boot(){
 if(['levels','tests'].includes(params.get('view'))){await import('./advanced.js');return;}
 const profile=await initPage('admin','chinese');catalog=await request('/catalog');notice('');
 if(params.get('view')==='speaking-results'){const {adminSpeakingResults}=await import('/assets/js/chinese-speaking-admin-results.js');return adminSpeakingResults();}
 if(params.has('activities')){const lesson=catalog.lessons.find(l=>l.id===params.get('activities'));if(!lesson)throw Error('Không tìm thấy bài học.');const {activitiesEditor}=await import('./activities-editor.js');return activitiesEditor(lesson,catalog);}
 if(params.has('set'))return adminSetEditor(params.get('set'),{catalog,profile,params});
 if(params.get('view')==='progress')return progress();
 if(params.has('lesson'))return adminLessonWorkspace(catalog,params);
 adminCatalog(catalog,params);
}
async function progress(){
 document.querySelector('main>h1').textContent='Tiến độ học sinh';
 const {progress:rows}=await request('/stats'),students=[...new Map(rows.map(r=>[r.student_id,r.display_name])).entries()];
 const filter=field('Học sinh','student','','text',[['','Tất cả học sinh'],...students]),list=el('div');
 const render=()=>{const id=filter.querySelector('select').value;const filtered=rows.filter(r=>!id||r.student_id===id);list.replaceChildren(table(['Học sinh','Cấp','Tài liệu','Đã học'],filtered.map(r=>[r.display_name,'HSK '+r.level_id,r.title,r.percent+'%'])));};
 root().append(el('header',{class:'admin-section-intro'},[el('img',{src:'/assets/images/mascot-owl.svg',width:76,height:84,alt:''}),el('div',{},[el('span',{class:'admin-mode-eyebrow',text:'ĐỒNG HÀNH CÙNG HỌC TRÒ'}),el('h2',{text:students.length+' học sinh · '+rows.length+' tài liệu đã học'}),el('p',{text:'Chọn học sinh để theo dõi tiến độ theo bài và cấp HSK.'})])]));
 filter.onchange=render;root().append(card('Tiến độ theo tài liệu',[filter,list]));render();if(!rows.length)notice('Chưa có lượt học. Tiến độ sẽ xuất hiện khi học sinh bắt đầu học tài liệu.');
}
boot().catch(error);
