import { api } from './api.js';

export async function courseProfile(profile,active) {
 if(active==='courses')return profile;
 const id=localStorage.getItem('ttnava-course')||decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('ttnava_course='))?.split('=')[1]||'');
 if(!id){location.replace('/pages/student/courses/');throw new Error('Con chọn khóa học trước nhé.');}
 const {data:course}=await api('/api/v1/courses/'+encodeURIComponent(id)+'/access');
 localStorage.setItem('ttnava-course',id);
 profile.grade=['primary','secondary'].includes(course.kind)?Number(course.level):null;
 profile.course=course;
 if(course.kind==='chinese'&&['home','learning'].includes(active)){
  location.replace('/pages/student/chinese/');
  throw new Error('Đang mở danh sách bài học Tiếng Trung…');
 }
 return profile;
}
export function enterCourse(course) {
 localStorage.setItem('ttnava-course',course.id);
 document.cookie='ttnava_course='+encodeURIComponent(course.id)+'; Path=/; SameSite=Lax';
 location.assign(course.kind==='chinese'?'/pages/student/chinese/':'/pages/student/learning/');
}
