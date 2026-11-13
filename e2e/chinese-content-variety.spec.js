import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
let server,origin;
test.beforeAll(async()=>{const root=path.resolve('frontend');server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');let target=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(url.pathname.endsWith('/'))target=path.join(target,'index.html');if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const data=await readFile(target);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
function fixture(number){
 const lesson={id:'lesson-'+number,title:'Bài '+number,level_id:1,position:number},set={id:'set-'+number,lesson_id:lesson.id,level_id:1,lesson_title:lesson.title,title:'Tài liệu '+number},words=['我','你','她'].map((hanzi,n)=>({id:'word-'+number+'-'+n,kind:'vocabulary',data:{hanzi,pinyin:['wǒ','nǐ','tā'][n],meaning:['tôi','bạn','cô ấy'][n]}}));
 const questions=words.flatMap(w=>[0,1].map(n=>({id:'question-'+w.id+'-'+n,kind:'question',data:{vocabulary_id:w.id,type:'choice',prompt:n?`Chọn chữ Hán có nghĩa “${w.data.meaning}”.`:`Trong bài học, “${w.data.hanzi}” có nghĩa là gì?`,options:[w.data.hanzi,w.data.meaning],accepted:[n?w.data.hanzi:w.data.meaning],explanation:'Lời giải sau khi lật.'}})));
 return {lesson,set,words,questions};
}
async function mock(page){
 const sources=Array.from({length:10},(_,n)=>fixture(n+1)),progress=new Map(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/assets/js/ui-core.js',r=>r.fulfill({contentType:'text/javascript',body:'export async function initPage(){return {course:{kind:"chinese",level:1}}} export function syncDiamondTotal(){}'}));
 await page.route('**/api/v1/chinese/**',async route=>{const url=new URL(route.request().url()),number=Number(url.pathname.match(/sets\/set-(\d+)/)?.[1]||1),f=sources[number-1];let data={};
  if(url.pathname.endsWith('/catalog'))data={levels:[{id:1,title:'HSK 1'}],lessons:sources.map(s=>s.lesson),sets:sources.map(s=>s.set),counts:[],reviews:[],completion:[],progress:[]};
  else if(url.pathname.endsWith('/progress')){progress.set(number,route.request().postDataJSON());data={saved:true};}
  else if(url.pathname.includes('/study/')){const item=f.questions.find(q=>url.pathname.endsWith(q.id));data={accepted:item.data.accepted,explanation:item.data.explanation};}
  else if(/\/sets\/set-\d+$/.test(url.pathname))data={set:f.set,items:[...f.words,{...f.words[0],id:'duplicate-'+number},...f.questions.map(q=>({...q,data:Object.fromEntries(Object.entries(q.data).filter(([k])=>!['accepted','explanation'].includes(k)))}))],progress:progress.get(number)||null,activities:null};
  return route.fulfill({json:{data}});
 });return {sources,errors};
}
test('all ten lessons show each word once in flashcards, vocabulary and listening',async({page})=>{
 const state=await mock(page);for(let n=1;n<=10;n++){
  await page.goto(origin+'/pages/student/chinese/?set=set-'+n+'&mode=cards');await expect(page.locator('.card-count')).toHaveText('Thẻ 1 / 3');const seen=new Set();for(let i=0;i<3;i++){seen.add(await page.locator('.flashcard .hanzi').textContent());await page.getByRole('button',{name:'Tiếp →',exact:true}).click();}expect(seen.size).toBe(3);
  await page.goto(origin+'/pages/student/chinese/?set=set-'+n+'&mode=words');await expect(page.locator('.hub-table tbody tr')).toHaveCount(3);
  await page.goto(origin+'/pages/student/chinese/?set=set-'+n+'&mode=listen');await page.getByRole('button',{name:'Bắt đầu chặng 1',exact:true}).click();await expect(page.locator('.quiz-prompt')).toContainText('1/3');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }expect(state.errors).toEqual([]);
});
test('shuffled cards resume at the same position and reveal answers only when flipped',async({page})=>{
 const state=await mock(page);await page.goto(origin+'/pages/student/chinese/?set=set-1&mode=cards');await page.getByRole('button',{name:'Tiếp →',exact:true}).click();const face=await page.locator('.flashcard').textContent();await page.reload();await expect(page.locator('.card-count')).toHaveText('Thẻ 2 / 3');await expect(page.locator('.flashcard')).toHaveText(face);
 await page.locator('summary').filter({hasText:'Tùy chọn thẻ'}).click();await page.locator('[name=source]').selectOption('question');await expect(page.locator('.card-count')).toContainText('/ 6');await expect(page.locator('.flashcard')).not.toContainText('Lời giải');await page.locator('.flashcard').click();await expect(page.locator('.study-explanation')).toHaveText('Lời giải sau khi lật.');await page.getByRole('button',{name:'Tiếp →',exact:true}).click();await expect(page.locator('.study-explanation')).toHaveCount(0);expect(state.errors).toEqual([]);
});
test('admin preview uses the same deduplicated word deck and explicit word links',async({page})=>{
 const state=await mock(page);await page.goto(origin+'/pages/student/chinese/?set=set-1&mode=words');const f=state.sources[0];
 await page.evaluate(async f=>{const {mountAdminStudentPreview}=await import('/assets/js/chinese-admin-preview.js');mountAdminStudentPreview(document.querySelector('#content'),{set:f.set,items:[...f.words,{...f.words[0],id:'duplicate'}],mode:'cards'});},f);
 await expect(page.locator('.card-count')).toHaveText('Thẻ 1 / 3');await page.locator('.admin-study-modes').getByRole('button',{name:'Từ mới',exact:true}).click();await expect(page.locator('.hub-table tbody tr')).toHaveCount(3);await page.locator('.hub-table').getByRole('link',{name:'bạn',exact:true}).click();await expect(page.locator('.flashcard')).toContainText('你');expect(state.errors).toEqual([]);
});
