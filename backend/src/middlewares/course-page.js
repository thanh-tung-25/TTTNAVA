import { requireCourse } from '../services/course-service.js';
export async function coursePageGuard(req,res,next) {
 if(req.path.startsWith('/courses')||/\.[a-z0-9]+$/i.test(req.path)&&!req.path.endsWith('.html'))return next();
 try{
  const course=await requireCourse(req.user.id,req.cookies.ttnava_course||'');
  if(['primary','secondary','highschool'].includes(course.kind)){
   const path=req.path.replace(/\/index\.html$/,'/').replace(/\/$/,'');
   if(path==='/home')return res.redirect('/pages/student/learning/');
   if(path==='/practice'&&!req.query.session||path==='/lesson'||path==='/exam'&&!req.query.attempt&&req.query.formal!=='1'){
    const params=new URLSearchParams();
    for(const key of ['subject','topic'])if(typeof req.query[key]==='string')params.set(key,req.query[key]);
    if(path==='/lesson'&&typeof req.query.id==='string'){params.set('lesson',req.query.id);params.set('panel','knowledge');}
    if(path==='/exam')params.set('view','quiz');
    return res.redirect('/pages/student/learning/'+(params.size?'?'+params.toString():''));
   }
  }
  next();
 }
 catch(error){if(error.code==='COURSE_LOCKED')res.redirect('/pages/student/courses/');else next(error);}
}
