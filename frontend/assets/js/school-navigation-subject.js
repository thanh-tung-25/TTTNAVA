import {subjectsFor} from './primary-subjects.js';

export function schoolNavigationSubject(profile){
 const allowed=subjectsFor(profile).map(([id])=>id),requested=new URLSearchParams(location.search).get('subject');let saved;
 try{if(profile.course?.id)saved=localStorage.getItem('ttnava-school-subject:'+profile.course.id);}catch{}
 return [requested,saved].find(id=>allowed.includes(id))||allowed[0];
}
export function schoolDestination(key,subject){
 const params=new URLSearchParams(key==='quiz'?{view:'quiz',subject}:key==='papers'?{view:'papers',subject}:{subject});
 return (['exam','papers'].includes(key)?'/pages/student/exam/':'/pages/student/learning/')+'?'+params;
}
export function syncSchoolNavigationSubject(subject,profile){
 if(!subjectsFor(profile).some(([id])=>id===subject))return;
 try{if(profile.course?.id)localStorage.setItem('ttnava-school-subject:'+profile.course.id,subject);}catch{}
 for(const link of document.querySelectorAll('[data-school-destination]'))link.href=schoolDestination(link.dataset.schoolDestination,subject);
}
