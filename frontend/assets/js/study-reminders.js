import {api,el} from './api.js';
export async function showStudyReminders(){
 const params=new URLSearchParams(location.search);if(params.has('set')||params.has('attempt'))return;
 try{const {data}=await api('/api/v1/learning/reminders');if(!data.due||document.getElementById('study-reminder'))return;
 const box=el('aside',{id:'study-reminder',class:'card'},[el('strong',{text:'Có '+data.due+' từ đến lịch ôn'}),el('p',{text:'Ôn một chút để nhớ lâu hơn. Không cần học hết trong một lần.'}),el('a',{class:'btn btn-secondary',href:'/pages/student/chinese/?view=notebook&filter=due',text:'Ôn từ đến hạn'})]);document.querySelector('main')?.prepend(box);
 }catch{}
}
