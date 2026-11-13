import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {vnRange} from '../src/utils/time.js';
import {createTestUser,loginStudent} from './helpers/index.js';
const users=[];
let client,first,second,zero,primary,locked,deleted,guardian,expired;
async function student(options={}){const user=await createTestUser({enrolled:false,...options});users.push(user);return user;}
async function credit(user,amount,type='chinese',created=new Date()){
 await query('INSERT INTO diamond_ledger(profile_id,amount,reason,ref_type,ref_id,created_at) VALUES (?,?,?,?,?,?)',[user.id,amount,type==='chinese'?'chinese_complete':'practice_complete',type,randomUUID(),created]);
}
const board=(range='week',extras={})=>client.get('/api/v1/diamonds/leaderboard').query({program:'chinese',range,limit:100,...extras});
beforeAll(async()=>{
 first=await student({grade:3});second=await student({grade:null});zero=await student({grade:9});primary=await student({grade:1});locked=await student({locked:true});deleted=await student();guardian=await student();expired=await student();
 await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'hsk-1','admin')",[zero.id]);
 await query("INSERT INTO course_enrollments(student_id,course_id,source,expires_at) VALUES (?,'hsk-1','admin',?)",[expired.id,new Date(Date.now()-86400000)]);
 await query('UPDATE profiles SET deleted_at=CURRENT_TIMESTAMP WHERE id=?',[deleted.id]);await query("UPDATE profiles SET account_kind='guardian' WHERE id=?",[guardian.id]);
 await credit(first,3);await credit(first,-1);await credit(first,1000,'practice');await credit(second,1);await credit(primary,99,'practice');
 const old=new Date(Math.min(vnRange('week').start.getTime(),vnRange('month').start.getTime())-86400000);await credit(second,5,'chinese',old);
 for(const user of [locked,deleted,guardian])await credit(user,100);client=await loginStudent(first);
});
afterAll(async()=>{for(const user of users){await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);await query('DELETE FROM profiles WHERE id=?',[user.id]);}});
it('ranks only Chinese earnings, includes Chinese learners of any grade and keeps zero-score active learners',async()=>{
 const response=await board();expect(response.status).toBe(200);expect(response.body.meta.program).toBe('chinese');expect(response.headers['cache-control']).toContain('no-store');
 const rows=response.body.data;expect(rows.find(p=>p.profileId===first.id)?.diamonds).toBe(3);expect(rows.find(p=>p.profileId===second.id)).toMatchObject({diamonds:1,grade:null});expect(rows.find(p=>p.profileId===zero.id)?.diamonds).toBe(0);
 expect(rows.findIndex(p=>p.profileId===first.id)).toBeLessThan(rows.findIndex(p=>p.profileId===second.id));
 for(const hidden of [primary,locked,deleted,guardian,expired])expect(rows.map(p=>p.profileId)).not.toContain(hidden.id);
 for(const row of rows)for(const key of ['email','username','password_hash','gmail_identity'])expect(row).not.toHaveProperty(key);
});
it('filters week and month by Vietnam time and includes older Chinese earnings only in all-time ranking',async()=>{
 for(const range of ['week','month'])expect((await board(range)).body.data.find(p=>p.profileId===second.id).diamonds).toBe(1);
 const rows=(await board('all')).body.data;expect(rows.find(p=>p.profileId===second.id).diamonds).toBe(6);expect(rows.findIndex(p=>p.profileId===second.id)).toBeLessThan(rows.findIndex(p=>p.profileId===first.id));
});
it('keeps the existing general leaderboard and grade filtering separate',async()=>{
 const response=await client.get('/api/v1/diamonds/leaderboard').query({range:'all',grade:3,limit:100});expect(response.status).toBe(200);expect(response.body.meta.program).toBeUndefined();expect(response.body.data.find(p=>p.profileId===first.id).diamonds).toBe(1003);expect(response.body.data.every(p=>p.grade===3)).toBe(true);
});
it('rejects invalid leaderboard filters',async()=>{
 expect((await board('year')).status).toBe(400);expect((await board('week',{program:'invalid'})).status).toBe(400);expect((await board('week',{limit:101})).status).toBe(400);
});
