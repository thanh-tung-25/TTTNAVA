import {it,expect,vi,afterEach,afterAll} from 'vitest';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {createTestUser,loginStudent,app} from './helpers/index.js';
import {query} from '../src/config/db.js';
const users=[];
afterEach(()=>vi.restoreAllMocks());
afterAll(async()=>{for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);});
it('requires login and rejects oversized text and arbitrary providers',async()=>{
 expect((await request(app).post('/api/v1/question-audio').send({text:'hello',lang:'en-US'})).status).toBe(401);
 const user=await createTestUser();users.push(user);const agent=await loginStudent(user);
 for(const body of [{text:'a'.repeat(181),lang:'vi-VN'},{text:'hello',lang:'unknown'},{text:'hello',lang:'vi-VN',url:'https://example.com'}])expect((await agent.post('/api/v1/question-audio').send(body)).status).toBe(400);
});
it('returns MPEG bytes, caches successful audio and reports provider failures',async()=>{
 const user=await createTestUser();users.push(user);const agent=await loginStudent(user);
 const bytes=Buffer.alloc(1024,42),fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}}));
 const body={text:'Test '+randomUUID(),lang:'vi-VN'};
 const first=await agent.post('/api/v1/question-audio').send(body);expect(first.status).toBe(200);expect(first.headers['content-type']).toContain('audio/mpeg');expect(first.body.length).toBe(1024);
 expect((await agent.post('/api/v1/question-audio').send(body)).status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(1);
 const upstream=new URL(String(fetcher.mock.calls[0][0]));expect(upstream.hostname).toBe('translate.google.com');expect(upstream.searchParams.get('tl')).toBe('vi');
 fetcher.mockResolvedValue(new Response('unavailable',{status:503}));
 expect((await agent.post('/api/v1/question-audio').send({...body,text:'Other '+randomUUID()})).status).toBe(502);
});
