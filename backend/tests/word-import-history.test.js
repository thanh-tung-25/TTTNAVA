import fs from 'node:fs';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {createTestUser,loginStudent,app} from './helpers/index.js';
import request from 'supertest';
import {query} from '../src/config/db.js';
const bytes=fs.readFileSync(new URL('../../frontend/assets/templates/mau-nhap-cau-hoi.docx',import.meta.url));
const path='/api/v1/admin/questions/import/file',history='/api/v1/admin/content/word-documents';
const payload={lessonId:'kntt-toan-1-b03',questions:[{type:'fill_in',prompt:'Word history test: 1 + 1 = ?',options:[],answer:{accepted:['2']},explanation:'1 + 1 = 2',difficulty:'easy'}]};
let admin,student,documentId,questionIds=[];
beforeAll(async()=>{admin=await loginStudent(await createTestUser({username:'test_word_admin',role:'admin'}));student=await loginStudent(await createTestUser({username:'test_word_student'}));});
afterAll(async()=>{for(const id of questionIds)await query('DELETE FROM questions WHERE id=?',[id]);if(documentId)await query('DELETE FROM word_import_documents WHERE id=?',[documentId]);});
const send=(agent,body=payload,file=bytes)=>agent.post(path).field('payload',JSON.stringify(body)).attach('file',file,'history-test.docx');
it('stores original Word and question provenance in the same successful import',async()=>{
 const r=await send(admin);expect(r.status).toBe(201);documentId=r.body.data.documentId;questionIds=r.body.data.ids;expect(documentId).toBeTruthy();
 const [doc]=await query('SELECT * FROM word_import_documents WHERE id=?',[documentId]);expect(doc.original.equals(bytes)).toBe(true);expect(doc.question_count).toBe(1);expect(doc.lesson_id).toBe(payload.lessonId);
 const [q]=await query('SELECT import_document_id FROM questions WHERE id=?',[questionIds[0]]);expect(q.import_document_id).toBe(documentId);
});
it('lists archived Word with lesson and date, supports filters and downloads identical bytes',async()=>{
 const r=await admin.get(history+'?q=history-test&grade=1&semester=hk1');expect(r.status).toBe(200);const doc=r.body.data.find(d=>d.id===documentId);expect(doc.lesson_name).toContain('Nhiều hơn');expect(doc.imported_at).toBeTruthy();expect(doc.question_count).toBe(1);expect(doc.original).toBeUndefined();
 expect((await admin.get(history+'?q=history-test&grade=2')).body.data.some(d=>d.id===documentId)).toBe(false);
 const download=await admin.get(history+'/'+documentId+'/download').buffer(true).parse((res,done)=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>done(null,Buffer.concat(chunks)));});
 expect(download.status).toBe(200);expect(download.body.equals(bytes)).toBe(true);expect(download.headers['content-disposition']).toContain('history-test.docx');
});
it('rejects non-admin access and invalid Word without recording it',async()=>{
 expect((await student.get(history)).status).toBe(403);expect((await student.get(history+'/'+documentId+'/download')).status).toBe(403);expect((await request(app).get(history+'/'+documentId+'/download')).status).toBe(401);
 expect((await send(student)).status).toBe(403);expect((await send(admin,payload,Buffer.from('not a Word file'))).status).toBe(422);
});
it('rolls back the archive and all questions if any imported question is invalid',async()=>{
 const [before]=await query('SELECT COUNT(*) n FROM word_import_documents');
 const r=await send(admin,{...payload,questions:[payload.questions[0],{...payload.questions[0],explanation:''}]});expect(r.status).toBe(400);
 const [after]=await query('SELECT COUNT(*) n FROM word_import_documents');expect(after.n).toBe(before.n);
});
