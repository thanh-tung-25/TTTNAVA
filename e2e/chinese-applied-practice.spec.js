import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {activityTemplate} from '../frontend/assets/js/chinese-activity-templates.js';

let server,origin;
const titles=['你好','你叫什么名字','很高兴认识你','你去哪儿','你要吃什么','你在哪儿工作'];
const solutions=[
 [['老师','，','你好','！'],['我','很','好','。'],'我很好。','你好吗？','老师，你好！','我很好，谢谢！','再见！'],
 [['你','叫','什么','名字','？'],['我','是','学生','。'],'我不叫小明。','你叫什么名字？','我叫小明。','我是越南人。','你呢？'],
 [['这','是','我','的','名片','。'],['我','也','很','高兴','。'],'我没有名片。','我也很高兴。','请问，您贵姓？','对不起，我没有名片。','认识你我也很高兴！'],
 [['我','去','人民广场','。'],['人民广场','远','不','远','？'],'你有没有名片？','我家离学校很近。','我去人民广场。','人民广场远不远？','多少钱？'],
 [['我','要','两','碗','米饭','。'],['你','喝','茶','还是','咖啡','？'],'我要两杯茶。','这个菜有点儿辣。','我要牛肉和青菜。','还要两碗米饭。','我要一杯茶。'],
 [['我','在','苹果公司','工作','。'],['他','正在','看','电视','。'],'我不在这儿学汉语。','他在大学教英语。','我在苹果公司工作。','他是英语老师。','他在大学教英语。']
];
test.beforeAll(async()=>{
 const root=path.resolve('frontend');
 server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');let target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(url.pathname.endsWith('/'))target=path.join(target,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const file=await readFile(target);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');res.end(file);}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
async function mock(page,lesson=0,level=1,title=titles[lesson]){
 await page.route('**/assets/js/ui-core.js',r=>r.fulfill({contentType:'text/javascript',body:'export async function initPage(){return {course:{kind:"chinese",level:1}}} export function syncDiamondTotal(){}'}));
 const activities=activityTemplate({level_id:level,title});
 const set={id:'sample',lesson_id:'lesson',level_id:level,lesson_title:title,title:'Q1 Word',activity_count:activities?.tasks.length||0};
 await page.route('**/api/v1/chinese/**',r=>{
  const p=new URL(r.request().url()).pathname;
  let data;
  if(p.endsWith('/catalog'))data={levels:[{id:level,title:'HSK '+level}],lessons:[{id:'lesson',level_id:level,title}],sets:[set],counts:[{set_id:'sample',kind:'vocabulary',total:1}],progress:[],reviews:[],completion:[]};
  else if(p.endsWith('/sets/sample'))data={set,activities,items:[{id:'word',kind:'vocabulary',data:{hanzi:'你',pinyin:'nǐ',meaning:'bạn'}}],progress:null};
  else data={};
  return r.fulfill({json:{data}});
 });
}
test('all six Q1 lessons complete ordering, correction and role play with no errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let lesson=0;lesson<6;lesson++){
  await page.unrouteAll();await mock(page,lesson);
  await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
  await expect(page.getByRole('link',{name:'Luyện vận dụng',exact:true})).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'Bắt đầu lượt ngắn'}).click();
  for(const answer of solutions[lesson]){
   if(Array.isArray(answer))for(const word of answer)await page.getByRole('group',{name:'Từ để xếp câu'}).getByRole('button',{name:word,exact:true,disabled:false}).first().click();
   else await page.getByRole('button',{name:answer,exact:true}).click();
   await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
   await expect(page.locator('.applied-feedback')).toContainText('Đúng rồi!');
   await page.getByRole('button',{name:/Tiếp tục →|Xem kết quả/}).click();
  }
  await expect(page.locator('.quiz-score')).toHaveText('7/7');
 }
 expect(errors).toEqual([]);
});
test('mobile: hints, wrong answers, duplicate tokens, retry and lesson entry',async({page})=>{
 await page.setViewportSize({width:390,height:844});await mock(page,3);
 await page.goto(origin+'/pages/student/chinese/');
 await page.getByRole('link',{name:'Luyện vận dụng',exact:true}).click();
 await page.getByRole('button',{name:'Xếp câu',exact:true}).click();
 await expect(page.getByRole('button',{name:'Kiểm tra',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Gợi ý',exact:true}).click();
 for(const word of solutions[3][0])await page.getByRole('group',{name:'Từ để xếp câu'}).getByRole('button',{name:word,exact:true}).click();
 await page.getByRole('button',{name:'Bỏ từ 我',exact:true}).click();
 await expect(page.getByRole('button',{name:'Kiểm tra',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Xếp lại',exact:true}).click();
 for(const word of solutions[3][0])await page.getByRole('group',{name:'Từ để xếp câu'}).getByRole('button',{name:word,exact:true}).click();
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
 await expect(page.locator('.applied-feedback')).toContainText('có dùng gợi ý');
 await page.getByRole('button',{name:'Tiếp tục →'}).click();
 for(const word of solutions[3][1])await page.getByRole('group',{name:'Từ để xếp câu'}).getByRole('button',{name:word,exact:true,disabled:false}).first().click();
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await page.getByRole('button',{name:'Xem kết quả'}).click();
 await expect(page.locator('.quiz-score')).toHaveText('1/2');
 await page.getByRole('button',{name:'Luyện lại',exact:true}).click();await expect(page.locator('.quiz-position')).toContainText('1/2');
 await page.getByRole('button',{name:'Chọn cách luyện'}).click();await page.getByRole('button',{name:'Sửa lỗi',exact:true}).click();
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.locator('.applied-feedback')).toContainText('Hãy chọn');
 await page.getByRole('button',{name:'你不有没有名片？',exact:true}).click();await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
 await expect(page.locator('.applied-feedback')).toContainText('Chưa đúng');await expect(page.locator('.applied-feedback')).toContainText('你有没有名片？');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/chinese-applied-mobile.png',fullPage:true});
});
test('unrelated lessons do not get Q1 exercises',async({page})=>{
 for(const [level,title] of [[1,'Bài mới chưa có kịch bản'],[2,'你好']]){
  await page.unrouteAll();await mock(page,0,level,title);await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
  await expect(page.getByRole('link',{name:'Luyện vận dụng',exact:true})).toHaveCount(0);
  await expect(page.locator('#content')).toContainText('chưa có hoạt động vận dụng');
 }
});

test('admin authors all four types, previews, saves, reloads and controls student visibility',async({page})=>{
 let pack={topic:'',tasks:[],status:'draft',revision:0};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/assets/js/ui-core.js',r=>r.fulfill({contentType:'text/javascript',body:'export async function initPage(){return {course:{kind:"chinese",level:1}}} export function syncDiamondTotal(){}'}));
 await page.route('**/api/v1/chinese/**',async r=>{
  const p=new URL(r.request().url()).pathname,method=r.request().method();
  const lesson={id:'lesson',title:'Bài tự tạo',level_id:1,status:'published'},set={id:'sample',lesson_id:'lesson',level_id:1,lesson_title:lesson.title,title:'Tài liệu học',activity_count:pack.status==='published'?pack.tasks.length:0};
  let data;
  if(p.endsWith('/catalog'))data={levels:[{id:1,title:'HSK 1'}],lessons:[lesson],sets:[set],counts:[],reviews:[],progress:[],completion:[]};
  else if(p.endsWith('/activities/preview'))data=r.request().postDataJSON();
  else if(p.endsWith('/activities')){if(method==='PUT')pack={...r.request().postDataJSON(),revision:pack.revision+1};data=pack;}
  else if(p.endsWith('/sets/sample'))data={set,activities:pack.status==='published'?pack:null,items:[],progress:null};
  else data={};
  return r.fulfill({json:{data}});
 });
 await page.goto(origin+'/pages/admin/chinese/?lesson=lesson');
 await page.getByRole('link',{name:'Quản lý hoạt động vận dụng'}).click();
 await page.getByLabel('Chủ đề lượt luyện').fill('Tự giới thiệu');
 for(const [type,fields] of [
  ['order',{prompt:'Tôi ở trường.',tokens:'我\n在\n学校\n。',explanation:'在 đứng trước địa điểm.'}],
  ['fix',{prompt:'我不有名片。',options:'我没有名片。\n我不有名片。',answer:'我没有名片。',explanation:'Phủ định của 有 là 没有.'}],
  ['fill',{prompt:'我___名片。',answer:'没有',hint:'Phủ định của 有',explanation:'没有 nghĩa là không có.'}],
  ['dialogue',{prompt:'Nói nơi muốn đến.',speech:'你去哪儿？',pinyin:'nǐ qù nǎr',meaning:'Bạn đi đâu?',options:'我去学校。\n我叫小明。',answer:'我去学校。',explanation:'去 đứng trước điểm đến.'}]
 ]){
  await page.getByLabel('Dạng hoạt động').selectOption(type);await page.getByRole('button',{name:'Thêm hoạt động',exact:true}).click();
  const form=page.locator('form[data-index]').last();for(const [name,value]of Object.entries(fields))await form.locator(`[name=${name}]`).fill(value);
  if(type==='order')await expect(form.locator('[name=answer]')).toHaveValue('我在学校。');
 }
 await page.getByRole('button',{name:'Xem thử',exact:true}).click();await expect(page.getByRole('heading',{name:'Xem thử như học sinh'})).toBeVisible();expect(pack.tasks).toHaveLength(0);
 await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();expect(pack.tasks).toHaveLength(4);expect(pack.status).toBe('draft');
 await page.reload();await expect(page.getByLabel('Chủ đề lượt luyện')).toHaveValue('Tự giới thiệu');await expect(page.locator('form[data-index]')).toHaveCount(4);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Cho học sinh xem',exact:true}).click();expect(pack.status).toBe('published');
 await page.screenshot({path:'test-results/chinese-activities-admin-mobile.png',fullPage:true});
 await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');
 await expect(page.getByRole('button',{name:'Điền từ',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Điền từ',exact:true}).click();await page.getByRole('textbox',{name:'Từ cần điền'}).fill('  没有  ');
 await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();await expect(page.locator('.applied-feedback')).toContainText('Đúng rồi!');
 await page.getByRole('button',{name:'Xem kết quả'}).click();await expect(page.locator('.quiz-score')).toHaveText('1/1');
 await page.goto(origin+'/pages/admin/chinese/?activities=lesson');await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
 await page.goto(origin+'/pages/student/chinese/?set=sample&mode=apply');await expect(page.getByRole('link',{name:'Luyện vận dụng',exact:true})).toHaveCount(0);
 await expect(page.locator('#content')).toContainText('chưa có hoạt động vận dụng');expect(errors).toEqual([]);
});
