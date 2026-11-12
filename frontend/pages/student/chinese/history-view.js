import {el,root,request,link,card} from '/assets/js/chinese-common.js';

function panel(title,animal,children) {
 const box=card(title,children);box.classList.add('chinese-history-panel');
 const heading=box.querySelector('h2');
 heading.prepend(el('img',{src:'/assets/images/mascot-'+animal+'.svg',alt:'',width:56,height:60}));
 return box;
}

export async function renderHistory(catalog) {
 const rows=await request('/history'),active=rows.filter(a=>!a.finished_at),done=rows.filter(a=>a.finished_at);
 const testLink=link('Bài kiểm tra của lớp',{view:'tests'});testLink.classList.add('history-tests-link');
 testLink.prepend(el('img',{src:'/assets/images/mascot-lion.svg',alt:'',width:42,height:46}));root().append(testLink);
 const title=a=>catalog.sets.find(s=>s.id===a.set_id)?.lesson_title||'Bài kiểm tra Tiếng Trung';
 if(active.length)root().append(panel('Tiếp tục học','bunny',active.map(a=>{
  const resume=link('Tiếp tục',{attempt:a.id});resume.classList.add('btn-primary');
  return el('div',{class:'chinese-history-row'},[
   el('img',{class:'history-animal',src:'/assets/images/mascot-bunny.svg',alt:'',width:48,height:52}),
   el('div',{class:'chinese-history-info'},[el('strong',{text:title(a)}),el('span',{text:'Mình hoàn thành nốt bài này nhé!'})]),resume]);
 })));
 root().append(panel('Đã hoàn thành','panda',done.length?done.map(a=>{
  const delta=a.diamonds_delta;
  return el('article',{class:'chinese-history-row completed'},[
   el('div',{class:'history-score'},[el('strong',{text:String(a.score)}),el('span',{text:'/100'})]),
   el('div',{class:'chinese-history-info'},[el('strong',{text:title(a)}),el('time',{datetime:new Date(a.started_at).toISOString(),text:new Date(a.started_at).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}),el('span',{class:'history-reward',text:delta==null?'Đã lưu kết quả':(delta>0?'+':'')+delta+' 💎'})]),
   link('Xem kết quả',{attempt:a.id})]);
 }):[el('div',{class:'history-empty'},[el('img',{src:'/assets/images/mascot-panda.svg',alt:'',width:80,height:84}),el('p',{text:'Chưa có bài hoàn thành. Mình cùng thử một bài nhé!'}),link('Khám phá bài học',{})])]));
}
