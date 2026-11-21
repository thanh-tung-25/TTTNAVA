import {subjectsFor} from './primary-subjects.js';

export function schoolNavigationSubject(profile){
 const allowed=subjectsFor(profile).map(([id])=>id),requested=new URLSearchParams(location.search).get('subject');let saved;
 try{saved=localStorage.getItem('ttnava-school-subject:'+profile.course.id);}catch{}
 return [requested,saved].find(id=>allowed.includes(id))||allowed[0];
}
export function schoolDestination(key,subject){
 const params=new URLSearchParams(key==='quiz'?{view:'quiz',subject}:{subject});
 return (key==='exam'?'/pages/student/exam/':'/pages/student/learning/')+'?'+params;
}
export function syncSchoolNavigationSubject(subject,profile){
 if(!subjectsFor(profile).some(([id])=>id===subject))return;
 try{localStorage.setItem('ttnava-school-subject:'+profile.course.id,subject);}catch{}
 for(const link of document.querySelectorAll('[data-school-destination]'))link.href=schoolDestination(link.dataset.schoolDestination,subject);
}
