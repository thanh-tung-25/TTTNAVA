import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {activityTemplate} from '../frontend/assets/js/chinese-activity-templates.js';

let server,origin;
const titles=['Bài 1. Xin chào','Bài 2. Hỏi tên, Hỏi họ, Quốc tịch','很高兴认识你','你去哪儿','你要吃什么','你在哪儿工作'];
const vocabulary=[
 [{hanzi:'你',pinyin:'nǐ',meaning:'bạn, anh, chị (ngôi thứ hai)'},{hanzi:'您',pinyin:'nín',meaning:'ngài, ông, bà, anh, chị (cách gọi kính trọng)'},{hanzi:'我',pinyin:'wǒ',meaning:'tôi, tớ, mình'}],
 [{hanzi:'叫',pinyin:'jiào',meaning:'gọi, tên là'},{hanzi:'不',pinyin:'bù',meaning:'không (phủ định)'},{hanzi:'谁',pinyin:'shéi / shuí',meaning:'ai (hai cách đọc)'}],
];
test.beforeAll(async()=>{
 const root=path.resolve('frontend');
 server=createServer(async(req,res)=>{
  let target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(req.url.split('?')[0].endsWith('/'))target=path.join(target,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});

async function mock(page){
 await page.route('**/assets/js/ui-core.js',r=>r.fulfill({contentType:'text/javascript',body:'export async function initPage(){return {course:{kind:"chinese",level:1}}} export function syncDiamondTotal(){}'}));
 await page.addInitScript(()=>{
  window.__spoken=[];
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-CN',name:'Chinese'}],cancel:()=>{},speak:u=>{window.__spoken.push({text:u.text,lang:u.lang});u.onend();}}});
 });
 const lessons=titles.map((title,n)=>({id:'lesson-'+(n+1),level_id:1,title}));
 const sets=lessons.map((lesson,n)=>({id:'set-'+(n+1),lesson_id:lesson.id,level_id:1,lesson_title:lesson.title,title:lesson.title+' — Từ vựng và câu hỏi',activity_count:40}));
 await page.route('**/api/v1/chinese/**',route=>{
  const p=new URL(route.request().url()).pathname;
  let data={};
  if(p.endsWith('/catalog'))data={levels:[{id:1,title:'HSK 1'}],lessons,sets,counts:sets.flatMap(set=>[{set_id:set.id,kind:'vocabulary',total:3},{set_id:set.id,kind:'question',total:20}]),reviews:[],progress:[],completion:[]};
  else if(/\/sets\/set-[1-6]$/.test(p)){
   const index=Number(p.at(-1))-1,set=sets[index];
   data={set,items:[...vocabulary[index%2].map((data,n)=>({id:'word-'+n,kind:'vocabulary',data})),...Array.from({length:20},(_,n)=>({id:'question-'+n,kind:'question',data:{type:'choice',prompt:'Câu hỏi '+n,options:['A','B']}}))],activities:activityTemplate({level_id:1,title:titles[index]}),progress:null};
  }
  return route.fulfill({json:{data}});
 });
}

test('all six lessons group every existing study tool under its appropriate parent',async({page})=>{
 await mock(page);await page.goto(origin+'/pages/student/chinese/');
 await expect(page.locator('.chinese-lesson-row')).toHaveCount(6);
 for(let n=0;n<6;n++){
  const row=page.locator('.chinese-lesson-row').nth(n);
  await expect(row.locator('.chinese-lesson-primary .btn')).toHaveCount(3);
  await expect(row.getByRole('link',{name:'Từ mới',exact:true})).toBeHidden();
  await row.getByRole('button',{name:'Bài tập',exact:true}).click();
  await expect(row.getByRole('link',{name:'Luyện nghe',exact:true})).toBeVisible();
  await expect(row.getByRole('link',{name:'Luyện vận dụng',exact:true})).toBeVisible();
  await expect(row.getByRole('button',{name:'Quiz 20 câu',exact:true})).toBeVisible();
  await row.getByRole('button',{name:'Nhận mặt chữ',exact:true}).click();
  for(const name of ['Thẻ lật','Từ mới'])await expect(row.getByRole('link',{name,exact:true})).toBeVisible();
  await expect(row.getByRole('link',{name:'Luyện nghe',exact:true})).toBeHidden();
  await expect(row.getByRole('link',{name:'Luyện vận dụng',exact:true})).toBeHidden();
  await row.getByRole('button',{name:'Luyện nói với AI',exact:true}).click();
  for(const name of ['Luyện nói theo bài','Giao tiếp với AI','Phố tiếng Trung'])await expect(row.getByRole('link',{name,exact:true})).toBeVisible();
 }
});

for(const lesson of [1,2]){
 test(`lesson ${lesson}: open vocabulary, filter without tones, hear Chinese and flip the correct card`,async({page})=>{
  await page.setViewportSize({width:390,height:844});await mock(page);await page.goto(origin+'/pages/student/chinese/');
  await page.locator('.chinese-lesson-row').nth(lesson-1).getByRole('button',{name:'Nhận mặt chữ',exact:true}).click();
  await page.locator('.chinese-lesson-row').nth(lesson-1).getByRole('link',{name:'Từ mới',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`set=set-${lesson}&mode=words`));await expect(page.locator('.hub-table tbody tr')).toHaveCount(3);
  const word=vocabulary[lesson-1][0];
  await page.getByRole('searchbox',{name:'Tìm từ trong bài'}).fill(lesson===1?'ni':'jiao');
  // "ni" also matches nín; the Hanzi search identifies the exact entry.
  await expect(page.locator('.hub-table')).toContainText(word.hanzi);
  await page.getByRole('searchbox',{name:'Tìm từ trong bài'}).fill(word.hanzi);
  await expect(page.locator('.hub-table tbody tr')).toHaveCount(1);
  expect(await page.evaluate(()=>window.__spoken)).toEqual([]);
  await page.getByRole('button',{name:'Nghe '+word.hanzi,exact:true}).click();
  expect(await page.evaluate(()=>window.__spoken.at(-1))).toEqual({text:word.hanzi,lang:'zh-CN'});
  await page.locator('.hub-table').getByRole('link',{name:word.meaning,exact:true}).click();
  await expect(page.locator('.flashcard')).toContainText(word.hanzi);await page.locator('.flashcard').click();
  await expect(page.locator('.flashcard')).toContainText(word.meaning);await expect(page.locator('.flashcard')).toContainText(word.pinyin);
  await expect(page.getByRole('button',{name:'Đã nhớ',exact:true})).toBeVisible();
 });

 test(`lesson ${lesson}: listening works through a full round without revealing the answer first`,async({page})=>{
  await mock(page);await page.goto(origin+`/pages/student/chinese/?set=set-${lesson}&mode=listen`);
  await expect(page.locator('.listening-stage')).toHaveCount(1);await page.getByRole('button',{name:'Bắt đầu chặng 1',exact:true}).click();
  for(let n=1;n<=3;n++){
   await expect(page.locator('.quiz-prompt')).toHaveText(`Nghe và chọn nghĩa · ${n}/3`);
   const area=page.locator('.hub-card');await expect(area.locator('[role=status]').first()).toHaveText('');
   await page.getByRole('button',{name:'Nghe từ tiếng Trung',exact:true}).click();
   const spoken=await page.evaluate(()=>window.__spoken.at(-1));expect(spoken.lang).toBe('zh-CN');
   const word=vocabulary[lesson-1].find(word=>word.hanzi===spoken.text);expect(word).toBeTruthy();
   await area.getByRole('button',{name:word.meaning,exact:true}).click();
   await expect(area).toContainText('Đúng rồi! '+word.hanzi+' · '+word.pinyin);
   await area.getByRole('button',{name:'Câu tiếp theo',exact:true}).click();
  }
  await expect(page.locator('.hub-card')).toContainText('3/3 câu đúng');
  await page.getByRole('button',{name:'Luyện lại chặng này',exact:true}).click();await expect(page.locator('.quiz-prompt')).toContainText('1/3');
 });
}
