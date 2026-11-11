import {el,link} from './chinese-common.js';
import {chineseModes,chineseMode,modeCounts} from './chinese-learning-modes.js';

export function adminModeHeader(host,lesson,catalog,active,setId){
 const sets=catalog.sets.filter(s=>s.lesson_id===lesson.id),selected=chineseMode(active)||chineseModes[0];
 host.append(el('div',{class:'admin-study-bar'},[
  link('←',{level:lesson.level_id},'admin'),el('div',{},[el('span',{class:'admin-mode-eyebrow',text:`HSK ${lesson.level_id} · SOẠN BÀI`}),el('h2',{text:lesson.title})]),el('span',{class:'admin-role-badge',text:'Chế độ giáo viên'})
 ]));
 const nav=el('nav',{class:'admin-study-modes','aria-label':'Các mục học giống trang học sinh'});
 for(const mode of chineseModes){
  const all=sets.map(s=>modeCounts(s,catalog.counts)[mode.key]),total=mode.key==='apply'?Math.max(0,...all):all.reduce((n,v)=>n+v,0);
  const entry=link(mode.label,mode.key==='apply'?{activities:lesson.id}:{lesson:lesson.id,...(setId?{set:setId}:{}),mode:mode.key},'admin');entry.classList.add('admin-mode-link');
  entry.replaceChildren(el('span',{text:mode.label}),el('small',{text:total?`${total} ${mode.key==='apply'?'hoạt động':'nội dung'}`:'Thêm nội dung'}));
  if(selected?.key===mode.key)entry.setAttribute('aria-current','page');nav.append(entry);
 }
 host.append(nav);
 if(selected){
  const shared=['words','listen'].includes(selected.key)?'Từ vựng dùng chung cho Thẻ lật, Từ mới và Luyện nghe.':selected.description;
  host.append(el('section',{class:'admin-destination','aria-label':'Vị trí học sinh sẽ thấy nội dung'},[el('span',{class:'admin-mode-eyebrow',text:'NỘI DUNG SẼ HIỆN Ở'}),el('strong',{text:`HSK ${lesson.level_id} → ${lesson.title} → ${selected.label}`}),el('p',{text:shared})]));
 }
 return selected;
}
export function documentDestinations(set,counts){
 const values=modeCounts(set,counts);
 return chineseModes.filter(m=>values[m.key]>0).map(m=>m.label).join(' · ');
}
