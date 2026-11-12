import {el,root,button,link,card,field,percentage,error} from './chinese-common.js';
import {animalPath} from './animal-path.js';
import {chineseModes,modeCounts} from './chinese-learning-modes.js';
const extra=(title,children)=>el('details',{class:'learn-extra'},[el('summary',{text:title}),...children]);
function action(text,fn,primary=false){const b=button(text,async()=>{b.disabled=true;try{await fn();}catch(e){error(e);}finally{b.disabled=false;}});if(primary)b.className='btn btn-primary';return b;}
export function renderChineseLessons({catalog,params,quiz,role='student',manageTools,manageLesson}){
 const admin=role==='admin';
 const last=catalog.progress.find(p=>catalog.sets.some(s=>s.id===p.set_id)),lastSet=catalog.sets.find(s=>s.id===last?.set_id);
 const selectedLesson=catalog.lessons.find(l=>l.id===params.get('lesson'));
 const level=Number(params.get('level'))||selectedLesson?.level_id||lastSet?.level_id||catalog.sets[0]?.level_id||1;
 root().append(el('section',{class:'chinese-welcome'},[el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:154,height:154}),el('div',{},[el('h2',{text:admin?'Cùng cô xây từng bài học':'Mỗi ngày một từ mới!'}),el('p',{text:admin?'Chọn bài như học sinh, vào đúng phần để thêm và sửa nội dung.':'Chọn cấp HSK, tìm bài học và cùng khám phá nhé.'})])]));
 if(lastSet&&!admin){const resume=link('Tiếp tục: '+lastSet.lesson_title,{set:lastSet.id,mode:'cards'});resume.classList.add('resume-lesson');resume.replaceChildren(el('img',{src:'/assets/images/mascot-bunny.svg',alt:'',width:50,height:54}),el('span',{text:'Tiếp tục: '+lastSet.lesson_title}));root().append(resume);}
 const select=field(admin?'Cô đang soạn cấp nào?':'Con đang học cấp nào?','level',level,'text',catalog.levels.map(l=>[l.id,l.title]));select.classList.add('chinese-level-picker');select.onchange=e=>{params.delete('lesson');params.set('level',e.target.value);window.history.replaceState(null,'','?'+params);root().replaceChildren();renderChineseLessons({catalog,params,quiz,role,manageTools,manageLesson});root().querySelector('select')?.focus({preventScroll:true});};root().append(select);
 select.prepend(el('img',{src:'/assets/images/mascot-owl.svg',alt:'',width:60,height:74}));
 if(admin&&manageTools)root().append(manageTools(level));
 const rows=catalog.lessons.filter(l=>l.level_id===level&&(!admin||l.status!=='archived'));
 for(const [lessonIndex,lesson] of rows.entries()){
  const sets=catalog.sets.filter(s=>s.lesson_id===lesson.id&&(!admin||s.status!=='archived'));
  const island=card(lesson.title,sets.length?sets.map(s=>{
   const counts=catalog.counts.filter(c=>c.set_id===s.id),words=Number(counts.find(c=>c.kind==='vocabulary')?.total||0),questions=Number(counts.find(c=>c.kind==='question')?.total||0),reads=counts.some(c=>['reading','grammar','dialogue'].includes(c.kind)&&Number(c.total)>Number(c.speaking_total||0));
   const actions=el('div',{class:'learn-actions'});
   if(admin){
    const totals=modeCounts(s,catalog.counts);
    for(const m of chineseModes){const entry=link(m.label,m.key==='apply'?{activities:lesson.id}:{lesson:lesson.id,set:s.id,mode:m.key},'admin');if(['cards','quiz'].includes(m.key))entry.classList.add('btn-primary');entry.title=totals[m.key]?`Sửa ${totals[m.key]} nội dung · ${m.label}`:'Thêm nội dung · '+m.label;actions.append(entry);}
    actions.append(link('Giao tiếp với AI',{view:'ai-chat',level:lesson.level_id},role));
    return el('div',{class:'learn-document admin-document-card'},[el('strong',{text:s.title}),el('p',{class:'muted',text:[words?words+' từ':'',questions?questions+' câu hỏi':'',s.speaking_count?s.speaking_count+' câu luyện nói':''].filter(Boolean).join(' · ')||'Chưa có nội dung'}),el('span',{class:'admin-content-status '+(s.status==='published'&&lesson.status==='published'?'published':''),text:s.status==='published'&&lesson.status==='published'?'Đã cho học sinh xem':s.status==='published'?'Đã duyệt · bài học chưa mở':'Bản nháp'}),actions]);
   }
   if(words||questions){const start=link('Thẻ lật',{set:s.id,mode:'cards'});start.classList.add('btn-primary');actions.append(start);}
   if(words)actions.append(link('Từ mới',{set:s.id,mode:'words'}),link('Luyện nghe',{set:s.id,mode:'listen'}));
   if(questions){const q=action('Quiz 20 câu',()=>quiz(s.id),true);q.disabled=questions<20;q.title=questions<20?'Cần đủ 20 câu hỏi để làm quiz':'';actions.append(q);}
   if(reads)actions.append(link('Bài đọc',{set:s.id,mode:'read'}));
   if(s.activity_count>0)actions.append(link('Luyện vận dụng',{set:s.id,mode:'apply'}));
   if(s.activity_count>0||s.speaking_count>0)actions.append(link('Luyện nói',{set:s.id,mode:'speak'}));
   actions.append(link('Giao tiếp với AI',{view:'ai-chat',level:lesson.level_id}));
   const progress=percentage(s.id,catalog),meter=el('div',{class:'lesson-progress',role:'progressbar','aria-label':'Tiến độ '+s.title,'aria-valuenow':progress,'aria-valuemin':0,'aria-valuemax':100},[el('span')]);meter.firstElementChild.style.width=progress+'%';
   return el('div',{class:'learn-document'},[el('div',{},[el('strong',{text:s.title}),el('p',{class:'muted',text:[words?words+' từ':'',questions?questions+' câu hỏi':'',s.speaking_count?s.speaking_count+' câu luyện nói':'',words||questions||reads?progress+'% đã học':''].filter(Boolean).join(' · ')}),...(words||questions||reads?[meter]:[]),...(questions>0&&questions<20?[el('p',{class:'muted',text:'Chưa đủ 20 câu để làm quiz; con có thể học thẻ lật.'})]:[])]),actions]);
  }):[el('p',{class:'muted',text:admin?'Chọn một phần bên dưới để thêm nội dung đầu tiên.':'Chưa có nội dung.'}),...(admin?[el('div',{class:'learn-actions'},chineseModes.map(m=>link(m.label,m.key==='apply'?{activities:lesson.id}:{lesson:lesson.id,mode:m.key},'admin')))]:[])]);
  if(admin&&manageLesson)island.append(manageLesson(lesson));
  island.classList.add('lesson-island');const heading=island.querySelector('h2');heading.replaceWith(el('header',{class:'lesson-heading'},[el('img',{src:'/assets/images/mascot-'+['panda','bunny','owl'][lessonIndex%3]+'.svg',alt:'',width:70,height:76}),el('div',{},[el('span',{class:'lesson-eyebrow',text:'CÙNG NHAU KHÁM PHÁ'}),el('h2',{text:lesson.title})])]));root().append(island);
 }
 animalPath(root(),{selector:':scope > .lesson-island',title:admin?'Soạn bài học':'Khám phá bài học',hint:admin?'Vào đúng phần để thêm Word, sửa nội dung và cho học sinh xem.':'Chọn bài, học từ rồi chinh phục bản đồ 20 câu.'});
 if(!rows.length)root().append(card('Chưa có nội dung',[el('p',{text:'Cấp này chưa có bài học. Con có thể chọn cấp khác.'})]));
 if(admin)return;
 const due=catalog.reviews.filter(r=>r.next_review&&new Date(r.next_review)<=new Date()).length;
 if(due)root().append(link('Ôn '+due+' từ đến hạn',{view:'notebook',filter:'due'}));
 root().append(extra('Tiến độ học',[el('p',{text:'Mỗi quiz gồm 20 câu. Tiến độ dựa trên từ đã tự đánh giá, đoạn đã đọc và câu quiz đã chốt.'})]));
}
