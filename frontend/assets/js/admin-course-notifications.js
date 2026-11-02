import {api} from './api.js';
export function setupCourseNotifications(){
 const badge=document.querySelector('#course-pending-count');if(!badge)return;
 let loading=false,stopped=false;
 const refresh=async()=>{if(loading||document.hidden||stopped)return;loading=true;try{
  const {data}=await api('/api/v1/courses/admin/pending-count');
  if(stopped)return;badge.textContent=data.total?String(data.total):'';badge.hidden=!data.total;
  badge.parentElement.title=data.total+' yêu cầu thanh toán đang chờ xác nhận';
 }catch{/* The counter must not block admin pages. */}finally{loading=false;}};
 refresh();const timer=setInterval(refresh,30000);
 document.addEventListener('visibilitychange',refresh);
 document.addEventListener('courses:orders-changed',refresh);
 window.addEventListener('pagehide',()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);document.removeEventListener('courses:orders-changed',refresh);},{once:true});
}
