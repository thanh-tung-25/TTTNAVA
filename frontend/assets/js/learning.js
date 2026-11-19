import {initPage} from './ui-core.js';
import {mountSchoolStudy} from './school-study.js';
async function load(){
 const profile=await initPage('student',new URLSearchParams(location.search).get('view')==='quiz'?'exam':'learning');
 if(profile.course?.kind==='chinese'){location.replace('/pages/student/chinese/');return;}
 await mountSchoolStudy(profile);
}
load().catch(error=>{const notice=document.querySelector('#learning-notice');notice.textContent=error.message;notice.hidden=false;document.querySelector('#school-study').replaceChildren();});
