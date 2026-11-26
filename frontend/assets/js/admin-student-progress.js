import {api} from '/assets/js/api.js';

const dialog=document.getElementById('student-progress-dialog');
const node=(tag,attrs={},children=[])=>{const item=document.createElement(tag);for(const [key,value]of Object.entries(attrs)){if(key==='text')item.textContent=value;else if(key==='class')item.className=value;else item.setAttribute(key,value);}item.append(...children);return item;};
const percentText=value=>value===null||value===undefined?'Chưa có dữ liệu':`${value}%`;

function meter(value,title){
 const percent=Math.max(0,Math.min(100,Number(value)||0));
 return node('div',{class:'student-progress-meter',role:'progressbar','aria-label':title,'aria-valuenow':percent,'aria-valuemin':0,'aria-valuemax':100},[node('span',{style:`width:${percent}%`})]);
}
function modeRow(mode){
 const value=node('div',{class:'student-progress-value'},[node('strong',{text:percentText(mode.percent)}),node('span',{text:mode.available?`${mode.done}/${mode.total} nội dung`:'Chưa mở'})]);
 const row=node('div',{class:'student-progress-mode'},[node('div',{class:'student-progress-mode-head'},[node('span',{text:mode.title}),value])]);
 if(mode.available)row.append(meter(mode.percent,mode.title));
 for(const child of mode.children||[])row.append(node('div',{class:'student-progress-child'},[node('span',{text:child.title}),node('span',{text:child.available?`${percentText(child.percent)} · ${child.done}/${child.total}`:'Chưa mở'})]));
 return row;
}
function render(data){
 const close=node('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Đóng'});close.addEventListener('click',()=>dialog.close());
 const head=node('header',{class:'student-progress-head'},[node('div',{},[node('p',{class:'eyebrow',text:'TIẾN ĐỘ HỌC TẬP'}),node('h2',{id:'student-progress-title',text:data.student.displayName}),node('p',{class:'muted',text:`@${data.student.username} · ${data.course.title}`})]),close]);
 const overall=node('section',{class:'student-progress-overall'},[node('div',{},[node('strong',{text:percentText(data.overallPercent)}),node('span',{text:'Mức bao phủ nội dung toàn khóa'})]),...(data.overallPercent===null?[]:[meter(data.overallPercent,'Tiến độ chung khóa học')])]);
 const lessons=data.lessons.map(lesson=>{
  const groups=lesson.groups.map(group=>node('section',{class:'student-progress-group'},[node('div',{class:'student-progress-group-head'},[node('strong',{text:group.title}),node('span',{text:percentText(group.percent)})]),...group.modes.map(modeRow)]));
  const levelLabel=data.course.kind==='chinese'?`HSK ${lesson.level||''}`:`Lớp ${lesson.level||''}`;
  const card=node('article',{class:'student-progress-lesson'},[node('header',{class:'student-progress-lesson-head'},[node('div',{},[node('span',{class:'student-progress-level',text:levelLabel}),node('h3',{text:lesson.title})]),node('strong',{class:'student-progress-percent',text:percentText(lesson.percent)})]),...(lesson.percent===null?[]:[meter(lesson.percent,`Tiến độ ${lesson.title}`)]),node('div',{class:'student-progress-groups'},groups)]);
  return card;
 });
 dialog.replaceChildren(node('div',{class:'student-progress-dialog-body'},[head,overall,node('div',{class:'student-progress-lessons'},lessons.length?lessons:[node('p',{class:'muted',text:'Học sinh chưa có tiến độ được ghi nhận trong các bài đã mở.'})])]));
}

export async function openStudentProgress(id,program='chinese'){
 dialog.replaceChildren(node('div',{class:'loading',text:'Đang tải tiến độ học sinh…'}));
 if(!dialog.open)dialog.showModal();
 try{const {data}=await api(`/api/v1/admin/students/${encodeURIComponent(id)}/learning-progress?program=${encodeURIComponent(program)}`);render(data);}
 catch(error){const close=node('button',{type:'button',class:'btn btn-ghost',text:'Đóng'});close.addEventListener('click',()=>dialog.close());dialog.replaceChildren(node('div',{class:'student-progress-dialog-body'},[node('header',{class:'student-progress-head'},[node('h2',{text:'Không tải được tiến độ'}),close]),node('p',{role:'alert',text:error.message})]));}
}
