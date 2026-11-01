import { requireCourse } from '../services/course-service.js';
export async function coursePageGuard(req,res,next) {
 if(req.path.startsWith('/courses')||/\.[a-z0-9]+$/i.test(req.path)&&!req.path.endsWith('.html'))return next();
 try{await requireCourse(req.user.id,req.cookies.ttnava_course||'');next();}
 catch(error){if(error.code==='COURSE_LOCKED')res.redirect('/pages/student/courses/');else next(error);}
}
