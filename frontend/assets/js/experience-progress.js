import {request,boot,el,card,action,link,message} from './experience-ui.js';
async function main(){await boot('progress');const [rows,catalog]=await Promise.all([request('/progress'),request('/catalog')]);message('');const root=document.getElementById('experience-root');
 root.append(el('p',{text:'Tiến bộ được tính từ câu đã chấm trong các buổi học cá nhân. “Vững” cần kết quả tốt ở những ngày khác nhau.'}));
 if(!rows.length)root.append(card('Mình bắt đầu từ đây',el('p',{text:'Chưa có kết quả buổi học cá nhân. Làm một lượt ngắn để biết phần cần luyện.'}),link('Bắt đầu','/pages/student/today/',true)));
 const list=el('div',{class:'experience-list'});for(const item of catalog.items){const state=rows.find(r=>r.skill_key===item.id),percent=state?Math.round(state.correct_count/Math.max(1,state.attempts)*100):0;
  const start=action(state?.due?'Ôn đến lịch':'Luyện bài này',async()=>{const r=await request('/runs',{method:'POST',body:{kind:state?'review':'daily',itemId:item.id}});location.assign(r.href);});
  list.append(card(item.name,el('span',{class:'experience-pill',text:state?.status||'Chưa luyện'}),el('p',{text:state?state.correct_count+'/'+state.attempts+' câu đúng · '+state.spaced_successes+' ngày luyện tốt':item.total+' câu/từ đã xuất bản'}),el('progress',{max:100,value:percent,'aria-label':'Tỉ lệ câu đúng của '+item.name}),start));
 }root.append(list);
}main().catch(e=>message(e.message,true));
