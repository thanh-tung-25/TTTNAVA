import {el,formatDate} from './api.js';

export function renderEnrollments(enrollments,onRevoke){
 const container=document.querySelector('#admin-enrollments');
 const opened=new Set([...container.querySelectorAll('details[open]')].map(d=>d.dataset.learner));
 const learners=new Map();
 for(const enrollment of enrollments){
  if(!learners.has(enrollment.student_id))learners.set(enrollment.student_id,[]);
  learners.get(enrollment.student_id).push(enrollment);
 }
 const groups=[...learners.values()].sort((a,b)=>a[0].display_name.localeCompare(b[0].display_name,'vi'));
 container.replaceChildren(...(groups.length?groups.map(items=>{
  const student=items[0];
  const group=el('details',{class:'learner-enrollments',name:'learner-courses','data-learner':student.student_id,'data-username':student.username,...(opened.has(student.student_id)?{open:''}:{})},[
   el('summary',{},[el('span',{class:'learner-name',text:student.display_name+' (@'+student.username+')'}),el('span',{class:'learner-course-count',text:items.length+' khóa'})]),
  ]);
  for(const enrollment of items){
   const expired=enrollment.expires_at&&new Date(enrollment.expires_at)<=new Date();
   const row=el('div',{class:'course-admin-enrollment','data-student':student.username,'data-course':enrollment.course_id},[
    el('div',{},[el('strong',{text:enrollment.title}),el('p',{text:(enrollment.revoked_at?'Đã thu hồi':expired?'Đã hết hạn':'Đã mở khóa')+' · '+(enrollment.expires_at?'Đến '+formatDate(enrollment.expires_at):'Vĩnh viễn')})]),
   ]);
   if(onRevoke&&!enrollment.revoked_at&&!expired)row.append(el('button',{type:'button',class:'btn btn-ghost btn-sm',text:'Thu hồi',onclick:event=>onRevoke(enrollment,event.currentTarget)}));
   group.append(row);
  }
  return group;
 }):[el('p',{text:'Chưa có khóa học nào được mở.'})]));
}
