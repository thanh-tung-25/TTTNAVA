import {el} from './api.js';
import {paperPeriods,paperPeriodLabel} from './school-paper-periods.js';
import {elements,store} from './exam-context.js';

export function renderPaperCatalog(){
 document.querySelector('#exam-semester-filter').hidden=true;
 document.querySelector('#exam-list-heading').textContent=store.paperPeriod==='all'?'Đề thi đã đăng':paperPeriodLabel(store.paperPeriod);
 let periods=document.querySelector('#paper-periods');if(!periods){periods=el('nav',{id:'paper-periods',class:'paper-periods','aria-label':'Chọn đợt thi'});document.querySelector('#subject-tabs').after(periods);}
 const papers=[...(store.catalog.papers||[])].sort((a,b)=>a.title.localeCompare(b.title,'vi',{numeric:true}));
 periods.replaceChildren(...[['all','Tất cả'],...paperPeriods.map(([id,title])=>[id,title])].map(([id,title])=>el('button',{type:'button',class:'btn btn-ghost','aria-pressed':String(store.paperPeriod===id),text:title,onclick:()=>{store.paperPeriod=id;renderPaperCatalog();}})));
 const visible=papers.filter(paper=>store.paperPeriod==='all'||(paper.exam_config.period||'other')===store.paperPeriod);
 elements.topicList.replaceChildren(...visible.map(paper=>el('article',{class:'card school-paper-card'},[
  el('div',{},[el('span',{class:'paper-period-tag',text:paperPeriodLabel(paper.exam_config.period)}),el('h3',{text:paper.title}),el('p',{text:paper.item_count+' câu · '+paper.exam_config.duration_minutes+' phút · Chấm theo từng phần'})]),
  el('a',{class:'btn',href:'/pages/student/worksheets/?sheet='+encodeURIComponent(paper.id)+'&exam=1',text:'Vào làm đề'}),
 ])));
 if(!visible.length)elements.topicList.append(el('div',{class:'empty'},[el('h3',{text:'Chưa có đề được đăng'}),el('p',{text:'Giáo viên có thể đăng bộ đề cho môn và đợt thi này trong phần Quản lý đề thi.'})]));
}
