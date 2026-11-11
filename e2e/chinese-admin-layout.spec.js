import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {setSchema,lessonSchema,issues} from '../backend/src/validators/chinese.js';
const titles=['Bài 1. Xin Chào','Bài 2. Hỏi tên, Hỏi họ, Quốc tịch','Bài 3. 很高兴认识你 – Rất vui được làm quen với bạn','Bài 4. 你去哪儿 – Bạn đi đâu?','Bài 5. 你要吃什么 – Bạn muốn ăn gì?','Bài 6. 你在哪儿工作 – Bạn làm việc ở đâu?','Bài 7. Nội dung cô đang soạn'];
async function fixture(page){
 const lessons=titles.map((title,n)=>({id:randomUUID(),level_id:1,title,position:n+1,status:n===6?'draft':'published',description:'',image_url:''}));lessons.push({id:randomUUID(),level_id:2,title:'HSK 2 · Bài mới',position:1,status:'draft',description:'',image_url:''});
 const sets=lessons.slice(0,6).map(l=>({id:randomUUID(),lesson_id:l.id,level_id:1,title:l.position<3?'Câu hỏi và từ vựng · Bài '+l.position:'Bài '+l.position+' – Từ vựng và câu hỏi',status:'published',lesson_title:l.title,lesson_status:l.status,activity_count:0}));
 const items=new Map(sets.map(s=>[s.id,[{id:randomUUID(),kind:'vocabulary',data:{hanzi:'你好',pinyin:'nǐ hǎo',meaning:'xin chào'}},{id:randomUUID(),kind:'vocabulary',data:{hanzi:'朋友',pinyin:'péngyou',meaning:'bạn bè'}},{id:randomUUID(),kind:'question',data:{type:'choice',prompt:'“你好” có nghĩa là gì?',options:['xin chào','tạm biệt'],accepted:['xin chào'],approved:true}},{id:randomUUID(),kind:'reading',data:{text:'你好！很高兴认识你。'}},{id:randomUUID(),kind:'dialogue',data:{practice:'speaking',text:'你叫什么名字？',meaning:'Bạn tên là gì?'}}]]));
 const state={lessons,sets,items,role:'admin',requests:[],tests:[],pack:{topic:'Xin chào',status:'draft',revision:0,tasks:[]}};
 page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>localStorage.setItem('ttnava-course','hsk-1'));
 await page.route('**/api/v1/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,method=req.method();let data={};state.requests.push({path:p,method,body:method==='PUT'||method==='POST'?req.postDataJSON():null});
  const id=p.split('/').at(-1),set=sets.find(s=>s.id===id),lesson=lessons.find(l=>l.id===id);
  if(p.endsWith('/auth/me'))data={profile:{id:'teacher',username:'co_lan',displayName:'Cô Lan',role:state.role,adminScope:'chinese',avatarKey:'gau-truc',grade:null}};
  else if(p.endsWith('/access'))data={id:'hsk-1',kind:'chinese',level:1,title:'HSK 1',unlocked:true};
  else if(p.includes('/chat/'))data=[];
  else if(p.endsWith('/diamonds/summary'))data={total:0};
  else if(p.endsWith('/experience/preferences'))data={font_scale:'normal',speech_rate:1};
  else if(p.endsWith('/chinese/catalog')){
   const visible=sets.filter(s=>state.role==='admin'||s.status==='published'&&lessons.find(l=>l.id===s.lesson_id).status==='published');const counts=[];
   for(const s of visible)for(const i of items.get(s.id)||[]){let row=counts.find(c=>c.set_id===s.id&&c.kind===i.kind);if(!row){row={set_id:s.id,kind:i.kind,total:0,speaking_total:0};counts.push(row);}row.total++;if(i.data.practice==='speaking')row.speaking_total++;}
   data={levels:[{id:1,title:'HSK 1'},{id:2,title:'HSK 2'}],lessons:lessons.filter(l=>state.role==='admin'||l.status==='published'),sets:visible.map(s=>({...s,speaking_count:(items.get(s.id)||[]).filter(i=>i.data.practice==='speaking').length})),counts,progress:[],reviews:[],completion:[]};
  }else if(set&&p.includes('/sets/')){
   if(method==='PUT'){const d=setSchema.parse(req.postDataJSON());if(d.status==='published'&&issues(d.items).length)return route.fulfill({status:400,json:{error:{message:'Chưa thể xuất bản',details:issues(d.items)}}});Object.assign(set,{title:d.title,status:d.status});items.set(id,d.items.map(i=>({...i,id:i.id||randomUUID()})));data={id};}
   else data={set:{...set,lesson_status:lessons.find(l=>l.id===set.lesson_id).status},items:items.get(id),issues:issues(items.get(id)),activities:null,progress:null};
  }else if(p.endsWith('/chinese/sets')&&method==='POST'){const d=req.postDataJSON(),l=lessons.find(l=>l.id===d.lesson_id),s={id:randomUUID(),lesson_id:l.id,level_id:l.level_id,lesson_title:l.title,lesson_status:l.status,title:d.title,status:'draft',activity_count:0};sets.push(s);items.set(s.id,[]);data={id:s.id};}
  else if(p.endsWith('/chinese/lessons')&&method==='POST'){const d=lessonSchema.parse(req.postDataJSON()),l={id:randomUUID(),...d};lessons.push(l);data={id:l.id};}
  else if(lesson&&p.includes('/lessons/')&&method==='PUT'){Object.assign(lesson,lessonSchema.parse(req.postDataJSON()));data={id:lesson.id};}
  else if(p.endsWith('/activities'))data=state.pack;
  else if(p.endsWith('/chinese/tests')){if(method==='POST'){const t={id:randomUUID(),...req.postDataJSON()};state.tests.push(t);data={id:t.id};}else data=state.tests;}
  else if(p.endsWith('/chinese/stats'))data={progress:[{student_id:'student',display_name:'Ngọc Anh',level_id:1,title:sets[0].title,percent:45}]};
  return route.fulfill({json:{data}});
 });return state;
}

test('admin uses the student lesson map, shows all authoring sections, and has an accessible mobile sidebar',async({page})=>{
 const state=await fixture(page),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/pages/admin/chinese/');
 await expect(page.locator('.animal-zone')).toHaveCount(2);await expect(page.locator('.lesson-island')).toHaveCount(7);await expect(page.locator('.lesson-island').first().locator('.learn-actions a')).toHaveCount(7);
 await expect(page.locator('[role=progressbar]')).toHaveCount(0);await expect(page.locator('.admin-sidebar')).toBeVisible();await expect(page.locator('#app-header .nav-link')).toHaveCount(4);await expect(page.locator('#app-header')).not.toContainText('Khóa học & thanh toán');
 const sidebar=await page.locator('.admin-sidebar').boundingBox();expect(sidebar.x).toBe(0);expect(sidebar.y).toBe(0);expect(sidebar.height).toBe(950);
 await page.screenshot({path:'test-results/chinese-admin-catalog-desktop.png',fullPage:true,animations:'disabled'});
 const names=await page.locator('.lesson-heading h2').allTextContents();state.role='student';await page.goto('/pages/student/chinese/');await expect(page.locator('.lesson-island')).toHaveCount(6);expect(await page.locator('.lesson-heading h2').allTextContents()).toEqual(names.slice(0,6));
 state.role='admin';await page.setViewportSize({width:390,height:844});await page.goto('/pages/admin/chinese/');await expect(page.locator('.admin-sidebar')).toHaveJSProperty('inert',true);
 await page.getByRole('button',{name:'Mở điều hướng quản trị'}).click();await expect(page.locator('.admin-sidebar')).toHaveJSProperty('inert',false);await expect(page.getByRole('button',{name:'Đóng điều hướng'})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Mở điều hướng quản trị'})).toBeFocused();
 await page.screenshot({path:'test-results/chinese-admin-catalog-mobile.png',fullPage:true,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Cô đang soạn cấp nào?').selectOption('2');await expect(page.locator('.lesson-island')).toHaveCount(1);await expect(page.locator('.lesson-island')).toContainText('HSK 2 · Bài mới');expect(errors).toEqual([]);
});

test('adding a word from its section preserves quiz, reading and speaking content and returns to the same section',async({page})=>{
 const state=await fixture(page),set=state.sets[0],before=structuredClone(state.items.get(set.id).filter(i=>i.kind!=='vocabulary'));
 await page.goto('/pages/admin/chinese/');await page.locator('.lesson-island').first().getByRole('link',{name:'Từ mới',exact:true}).click();
 await expect(page).toHaveURL(new RegExp('set='+set.id));await expect(page.locator('.admin-destination')).toContainText('Từ mới');await expect(page.locator('.simple-question')).toHaveCount(2);
 await page.getByRole('button',{name:'+ Thêm từ mới',exact:true}).click();const form=page.locator('form[data-index]').last();await form.getByLabel('Chữ Hán',{exact:true}).fill('老师');await form.getByLabel('Pinyin',{exact:true}).fill('lǎoshī');await form.getByLabel('Nghĩa tiếng Việt',{exact:true}).fill('giáo viên');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await expect(page).toHaveURL(/mode=words/);await expect(page.locator('.simple-document').first()).toContainText('3 từ vựng');expect(state.items.get(set.id).filter(i=>i.kind!=='vocabulary')).toEqual(before);
 await page.goto('/pages/admin/chinese/?set='+set.id+'&mode=quiz');await expect(page.locator('.simple-question')).toHaveCount(1);await page.getByRole('button',{name:'+ Thêm câu hỏi',exact:true}).click();const question=page.locator('form[data-index]').last();await question.getByLabel('Câu hỏi',{exact:true}).fill('Ghép lời chào');
 const type=question.locator('select[name=type]');await expect(type).toBeVisible();await type.selectOption('matching');await question.locator('[name=options]').fill('你好\n再见');await question.locator('[name=targets]').fill('xin chào\ntạm biệt');await question.locator('[name=accepted]').fill('你好=xin chào | 再见=tạm biệt');await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();await expect(page).toHaveURL(/mode=quiz/);expect(state.items.get(set.id).filter(i=>i.kind==='question')).toHaveLength(2);
});

test('an empty lesson can create and publish a question directly in Quiz without visiting another section',async({page})=>{
 const state=await fixture(page),empty=state.lessons[6];await page.goto('/pages/admin/chinese/');await page.locator('.lesson-island').nth(6).getByRole('link',{name:'Quiz 20 câu',exact:true}).click();
 await expect(page.locator('.admin-destination')).toContainText(empty.title);await page.getByLabel('Tên tài liệu mới',{exact:true}).fill('Câu hỏi Bài 7');await page.getByRole('button',{name:'Tạo tài liệu',exact:true}).click();
 await expect(page.locator('.simple-question')).toHaveCount(1);const form=page.locator('form[data-index]');await form.getByLabel('Câu hỏi',{exact:true}).fill('“你好” có nghĩa là gì?');await form.locator('[name=options]').fill('xin chào\ntạm biệt');await form.locator('[name=accepted]').fill('xin chào');await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();
 await expect(page).toHaveURL(/mode=quiz/);await expect(page.locator('.simple-document')).toContainText('Câu hỏi Bài 7');expect(empty.status).toBe('published');const set=state.sets.at(-1);expect(set.status).toBe('published');expect(state.items.get(set.id)[0].data.approved).toBe(true);
});

test('lesson settings, assessments, HSK levels and progress share the same teacher navigation',async({page})=>{
 const state=await fixture(page);await page.goto('/pages/admin/chinese/');const first=page.locator('.lesson-island').first();await first.getByText('Sửa tên, thứ tự & trạng thái bài',{exact:true}).click();await first.getByLabel('Tên bài',{exact:true}).fill('Bài 1 · Xin chào các bạn');await first.getByLabel('Thứ tự bài',{exact:true}).fill('2');await first.getByRole('button',{name:'Lưu bài học',exact:true}).click();await expect(page.locator('.lesson-heading').first()).toContainText('Xin chào các bạn');
 await page.locator('.admin-chinese-navigation').getByRole('link',{name:'Bài kiểm tra',exact:false}).click();await expect(page.locator('main>h1')).toHaveText('Bài kiểm tra');await page.getByLabel('Tên bài kiểm tra',{exact:true}).fill('Ôn tập lời chào');await page.locator('.admin-test-sources input').first().check();await page.getByRole('button',{name:'Lưu bài kiểm tra',exact:true}).click();await expect(page.locator('.admin-assessment-card')).toContainText('Ôn tập lời chào');expect(state.tests[0].set_ids).toEqual([state.sets[0].id]);
 await page.locator('.admin-chinese-navigation').getByRole('link',{name:'Quản lý cấp HSK',exact:false}).click();await expect(page.locator('.admin-level-grid>.card')).toHaveCount(2);
 await page.locator('.admin-chinese-navigation').getByRole('link',{name:'Tiến độ học sinh',exact:false}).click();await expect(page.locator('tbody')).toContainText('Ngọc Anh');await expect(page.locator('tbody')).toContainText('45%');
 await page.setViewportSize({width:390,height:844});for(const view of ['tests','levels','progress']){await page.goto('/pages/admin/chinese/?view='+view);await expect(page.locator('main>h1')).not.toHaveText('Tiếng Trung');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
