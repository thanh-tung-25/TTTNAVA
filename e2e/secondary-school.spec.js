import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {query,closePool} from '../backend/src/config/db.js';
import {hashPassword} from '../backend/src/services/auth-service.js';
import {loadLiteratureBooks} from '../backend/scripts/lib/seed-literature.mjs';
import {loadSecondaryEnglishBooks} from '../backend/scripts/lib/seed-english-secondary.mjs';

const password='SecondaryUi@123!';
let admin,student,books,englishBooks;
const questions=[];
const sessions=new Map();
test.beforeAll(async()=>{
 if(process.env.DB_NAME!=='kids_learning_test')throw Error('THCS E2E requires isolated test database');
 books=await loadLiteratureBooks();
 englishBooks=await loadSecondaryEnglishBooks();
 for(const role of ['admin','student']){
  const id=randomUUID(),username='thcs_'+role+'_'+id.slice(0,6);
  await query('INSERT INTO profiles(id,username,email,password_hash,role,display_name,avatar_key,grade,admin_scope) VALUES (?,?,?,?,?,?,?,?,?)',[id,username,username+'@test.invalid',await hashPassword(password),role,'Kiểm thử THCS','meo',role==='student'?9:null,role==='admin'?'secondary':'super']);
  if(role==='admin')admin={id,username};else student={id,username};
 }
 await query("INSERT INTO course_enrollments(student_id,course_id,source) SELECT ?,id,'admin' FROM courses WHERE kind='secondary'",[student.id]);
 for(let i=0;i<10;i++){
  const id=randomUUID();questions.push(id);
  await query("INSERT INTO questions(id,topic_id,type,prompt,difficulty,status,created_by,published_at) VALUES (?,'toan-9-b01','fill_in',?,'easy','published',?,CURRENT_TIMESTAMP(3))",[id,`Kiểm thử giao diện THCS ${i+1}: x + 2 = 3. Tìm x.`,admin.id]);
  await query('INSERT INTO question_answers(question_id,answer_json,explanation) VALUES (?,?,?)',[id,JSON.stringify({accepted:['1']}),'Trừ 2 ở cả hai vế, được x = 1.']);
  const english=randomUUID();questions.push(english);
  await query("INSERT INTO questions(id,topic_id,type,prompt,difficulty,status,created_by,published_at) VALUES (?,'gs-tieng-anh-9-u01-vocabulary','fill_in',?,'easy','published',?,CURRENT_TIMESTAMP(3))",[english,`English UI test ${i+1}: We study English at school.`,admin.id]);
  await query('INSERT INTO question_answers(question_id,answer_json,explanation) VALUES (?,?,?)',[english,JSON.stringify({accepted:['study']}),'We study English at school.']);
 }
});
test.afterAll(async()=>{
 for(const user of [student,admin])if(user){
  await query('DELETE FROM practice_sessions WHERE student_id=?',[user.id]);
  await query('DELETE FROM profiles WHERE id=?',[user.id]);
 }
 for(const id of questions)await query('DELETE FROM questions WHERE id=?',[id]);
 await closePool();
});
async function login(page,user){
 if(sessions.has(user.id)){
  await page.context().addCookies(sessions.get(user.id));
  await page.goto(user===admin?'/pages/admin/questions/':'/pages/student/courses/');
  return;
 }
 await page.goto('/pages/login/');
 await page.locator('[name=username]').fill(user.username);
 await page.locator('[name=password]').fill(password);
 await page.locator('#login-button').click();
 await page.waitForURL(user===admin?/\/admin\/questions\//:/\/student\/courses\//);
 sessions.set(user.id,await page.context().cookies());
}

test('THCS admin selects both volumes, keeps review order and imports into the selected grade-nine lesson',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,admin);
 await expect(page.locator('.content-grade-tabs button')).toHaveText(['Lớp 6','Lớp 7','Lớp 8','Lớp 9']);
 await page.getByRole('button',{name:'Lớp 9',exact:true}).click();
 await page.getByLabel('Học kì',{exact:true}).selectOption('hk1');
 await page.getByLabel('Môn học',{exact:true}).selectOption('toan');
 await page.getByLabel('Chủ đề',{exact:true}).selectOption('toan-9-c03');
 await expect(page.locator('.content-lesson-card')).toHaveCount(5);
 await expect(page.locator('.content-lesson-card h2').nth(3)).toHaveText('Luyện tập chung');
 await expect(page.locator('.content-lesson-card h2').nth(4)).toContainText('Bài 10:');
 await expect(page.locator('#content-curriculum')).toContainText('Tập 1:');
 await page.getByLabel('Bài học',{exact:true}).selectOption('toan-9-b10');
 await page.locator('#content-import').click();
 await expect(page.locator('[data-import-destination]')).toContainText('Lớp 9');
 await expect(page.locator('[data-import-destination]')).toContainText('Bài 10:');
 await page.keyboard.press('Escape');
 await page.getByLabel('Học kì',{exact:true}).selectOption('hk2');
 await page.getByLabel('Môn học',{exact:true}).selectOption('toan');
 await page.getByLabel('Chủ đề',{exact:true}).selectOption('toan-9-c06');
 await expect(page.locator('.content-lesson-card')).toHaveCount(5);
 await expect(page.locator('.content-lesson-card h2').nth(3)).toHaveText('Luyện tập chung');
 await expect(page.locator('.content-lesson-card h2').nth(4)).toContainText('Bài 19:');
 await expect(page.locator('#content-curriculum')).toContainText('Tập 2:');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/secondary-admin-${test.info().project.name}.png`,fullPage:true});
 expect(errors).toEqual([]);
});

test('THCS admin opens Ngữ văn for grades six through nine and imports into the selected reading',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,admin);
 for(const book of books){
  await page.getByRole('button',{name:'Lớp '+book.grade,exact:true}).click();
  await page.getByLabel('Học kì',{exact:true}).selectOption('hk1');
  await expect(page.getByLabel('Môn học',{exact:true}).locator('option[value="tieng-viet"]')).toHaveText('Ngữ văn');
  await page.getByLabel('Môn học',{exact:true}).selectOption('tieng-viet');
  await page.getByLabel('Chủ đề',{exact:true}).selectOption(book.chapters[0].id);
  await expect(page.locator('.content-lesson-card h2')).toHaveText(book.chapters[0].lessons.map(l=>l.name));
 }
 const lesson=books.find(b=>b.grade===9).chapters[0].lessons[0];
 await page.getByLabel('Bài học',{exact:true}).selectOption(lesson.id);
 await page.locator('#content-import').click();
 await expect(page.locator('[data-import-destination]')).toContainText('Lớp 9');
 await expect(page.locator('[data-import-destination]')).toContainText('Ngữ văn');
 await expect(page.locator('[data-import-destination]')).toContainText(lesson.name);
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/literature-admin-${test.info().project.name}.png`,fullPage:true});
 expect(errors).toEqual([]);
});

test('student switches THCS grades and filters each Ngữ văn book by volume and thematic lesson',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,student);
 for(const book of books){
  await page.goto('/pages/student/courses/?program=secondary');
  const tile=page.locator('.course-tile').filter({has:page.getByRole('heading',{name:'Lớp '+book.grade,exact:true})});
  await tile.getByRole('button',{name:'Vào học',exact:true}).click();
  await expect(page.locator('#learning-course')).toHaveText('Lớp '+book.grade);
  await page.locator('.learning-subject[href$="subject=tieng-viet"]').click();
  await expect(page.locator('#subject-tabs [data-subject=tieng-viet]')).toContainText('Ngữ văn');
  await expect(page.locator('.topic-item')).toHaveCount(book.chapters.reduce((n,c)=>n+c.lessons.length,0));
  await page.getByLabel('Tập sách',{exact:true}).selectOption('hk2');
  const chapter=book.chapters[5];
  await page.getByLabel('Bài học',{exact:true}).selectOption(chapter.id);
  await expect(page.locator('.topic-item h3')).toHaveText(chapter.lessons.map(l=>l.name));
  await expect(page.locator('[data-secondary-chapter] h2')).toHaveText(chapter.name);
  await expect(page.locator('#topic-list [data-topic]:enabled')).toHaveCount(0);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/literature-student-${test.info().project.name}.png`,fullPage:true});
 await page.goto('/pages/student/exam/?subject=tieng-viet');
 await expect(page.locator('#subject-tabs [data-subject=tieng-viet]')).toContainText('Ngữ văn');
 await expect(page.locator('[data-chapter^="kntt-nguvan-9"]')).toHaveCount(10);
 expect(errors).toEqual([]);
});

test('student enters the THCS course and opens grade-nine practice with correct lessons and empty-state controls',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,student);
 await page.locator('[data-kind=secondary]').click();
 await expect(page.locator('.course-tile')).toHaveCount(4);
 const grade9=page.locator('.course-tile').filter({has:page.getByRole('heading',{name:'Lớp 9',exact:true})});
 await grade9.getByRole('button',{name:'Vào học',exact:true}).click();
 await expect(page.locator('#learning-course')).toHaveText('Lớp 9');
 await expect(page.locator('.learning-subject')).toHaveCount(3);
 await page.locator('.learning-subject[href$="subject=toan"]').click();
 await expect(page.locator('#practice-grade')).toHaveText('· LỚP 9');
 await expect(page.locator('.topic-item')).toHaveCount(39);
 await expect(page.locator('#subject-tabs [data-subject]')).toHaveCount(3);
 await expect(page.locator('[data-topic="toan-9-b02"]')).toBeDisabled();
 await page.locator('#secondary-volume').selectOption('hk1');
 await expect(page.locator('.topic-item')).toHaveCount(20);
 await page.locator('#secondary-chapter').selectOption('toan-9-c03');
 await expect(page.locator('.topic-item h3')).toHaveText([
  'Bài 7: Căn bậc hai và căn thức bậc hai',
  'Bài 8: Các phép tính với căn thức bậc hai',
  'Bài 9: Biến đổi đơn giản và rút gọn biểu thức chứa căn thức bậc hai',
  'Luyện tập chung',
  'Bài 10: Căn bậc ba và căn thức bậc ba',
 ]);
 await page.locator('#secondary-volume').selectOption('hk2');
 await expect(page.locator('.topic-item')).toHaveCount(19);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/secondary-student-${test.info().project.name}.png`,fullPage:true});
 await page.locator('#secondary-volume').selectOption('hk1');
 await page.locator('#secondary-chapter').selectOption('toan-9-c01');
 await page.locator('[data-topic="toan-9-b01"]').click();
 await expect(page.locator('#quiz-view')).toBeVisible();
 await expect(page.locator('#question-prompt')).toContainText('Kiểm thử giao diện THCS');
 await expect(page).toHaveURL(/\/student\/practice\//);
 expect(errors).toEqual([]);
});

test('THCS admin opens English units and reviews in each grade and imports into the selected topic',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page,admin);
 for(const book of englishBooks){
  await page.getByRole('button',{name:'Lớp '+book.grade,exact:true}).click();
  await page.getByLabel('Học kì',{exact:true}).selectOption('hk2');
  await page.getByLabel('Môn học',{exact:true}).selectOption('tieng-anh');
  await expect(page.getByLabel('Chủ đề',{exact:true}).locator('option')).toHaveCount(9);
  const review=book.chapters[15];
  await page.getByLabel('Chủ đề',{exact:true}).selectOption(review.id);
  await expect(page.locator('.content-lesson-card h2')).toHaveText(review.lessons.map(l=>l.name));
 }
 const lesson=englishBooks.find(b=>b.grade===9).chapters[15].lessons[0];
 await page.getByLabel('Bài học',{exact:true}).selectOption(lesson.id);
 await page.locator('#content-import').click();
 await expect(page.locator('[data-import-destination]')).toContainText('Tiếng Anh');
 await expect(page.locator('[data-import-destination]')).toContainText('Review 4');
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/english-admin-${test.info().project.name}.png`,fullPage:true});
 expect(errors).toEqual([]);
});

test('student filters all English books by volume and review and hears an English practice prompt',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__englishSpoken=[];
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:class{constructor(text){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{lang:'en-US'},{lang:'vi-VN'}],cancel:()=>{},speak:u=>window.__englishSpoken.push({text:u.text,lang:u.lang})}});
 });
 await login(page,student);
 for(const book of englishBooks){
  await page.goto('/pages/student/courses/?program=secondary');
  const tile=page.locator('.course-tile').filter({has:page.getByRole('heading',{name:'Lớp '+book.grade,exact:true})});
  await tile.getByRole('button',{name:'Vào học',exact:true}).click();
  await expect(page.locator('.learning-subject')).toHaveCount(3);
  await page.locator('.learning-subject[href$="subject=tieng-anh"]').click();
  await expect(page.locator('#subject-tabs [data-subject=tieng-anh]')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.topic-item')).toHaveCount(book.chapters.reduce((n,c)=>n+c.lessons.length,0));
  await page.getByLabel('Học kì',{exact:true}).selectOption('hk2');
  await expect(page.getByLabel('Unit / Review',{exact:true}).locator('option')).toHaveCount(9);
  const review=book.chapters[15];
  await page.getByLabel('Unit / Review',{exact:true}).selectOption(review.id);
  await expect(page.locator('.topic-item h3')).toHaveText(review.lessons.map(l=>l.name));
  await expect(page.locator('#topic-list [data-topic]:enabled')).toHaveCount(0);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/english-student-${test.info().project.name}.png`,fullPage:true});
 await page.getByLabel('Học kì',{exact:true}).selectOption('hk1');
 await page.getByLabel('Unit / Review',{exact:true}).selectOption('gs-tieng-anh-9-u01');
 await page.locator('[data-topic="gs-tieng-anh-9-u01-vocabulary"]').click();
 await expect(page.locator('#quiz-view')).toBeVisible();
 await page.getByRole('button',{name:'🔊 Nghe câu hỏi',exact:true}).click();
 expect(await page.evaluate(()=>window.__englishSpoken.at(-1))).toMatchObject({lang:'en-US'});
 expect(errors).toEqual([]);
});
