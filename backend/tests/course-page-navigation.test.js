import {test,expect,vi} from 'vitest';
vi.mock('../src/services/course-service.js',()=>({requireCourse:vi.fn(async()=>({kind:'highschool',level:12}))}));
import {coursePageGuard} from '../src/middlewares/course-page.js';
for(const path of ['/exam/','/exam/index.html','/learning/'])test(path+' remains reachable without redirecting to a lesson quiz',async()=>{const res={redirect:vi.fn()},next=vi.fn();await coursePageGuard({path,query:{subject:'hoa-hoc'},user:{id:'fixture'},cookies:{ttnava_course:'grade-12'}},res,next);expect(next).toHaveBeenCalledOnce();expect(res.redirect).not.toHaveBeenCalled();});
test('practice shortcut continues to resolve to the correct lesson subject',async()=>{const res={redirect:vi.fn()},next=vi.fn();await coursePageGuard({path:'/practice/',query:{subject:'hoa-hoc'},user:{id:'fixture'},cookies:{ttnava_course:'grade-12'}},res,next);expect(res.redirect).toHaveBeenCalledWith('/pages/student/learning/?subject=hoa-hoc');});
