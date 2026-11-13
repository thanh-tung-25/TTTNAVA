export function configureChinesePage(profile,params){
 const title=document.querySelector('.chinese-pagebar h1');
 if(title)title.textContent=profile.course.title||'Tiếng Trung HSK '+profile.course.level;
 document.body.classList.toggle('is-studying',params.has('set')||params.has('attempt'));
 document.body.classList.toggle('is-speaking',params.get('mode')==='speak');
 const labels={notebook:'Sổ từ',history:'Kết quả học tập',tests:'Bài kiểm tra','ai-chat':'Giao tiếp với AI',street:'Phố tiếng Trung'};
 document.title=(labels[params.get('view')]||'Bài học '+(profile.course.title||'Tiếng Trung'))+' — TTNAVA';
 for(const a of document.querySelectorAll('.student-account-study-tools a')){
  if(new URL(a.href).searchParams.get('view')===params.get('view')&&params.has('view'))a.setAttribute('aria-current','page');
 }
}
