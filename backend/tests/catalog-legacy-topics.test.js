import {it,expect} from 'vitest';
import {listTopics} from '../src/services/catalog-service.js';
import {query} from '../src/config/db.js';

it('empty old topics do not occupy alternating positions in the Grade 1 lesson list',async()=>{
 const topics=await listTopics('toan',1);
 const official=topics.filter(t=>t.id.startsWith('kntt-toan-1-b'));
 expect(official).toHaveLength(41);
 expect(topics.slice(0,10).map(t=>t.id)).toEqual(Array.from({length:10},(_,i)=>'kntt-toan-1-b'+String(i+1).padStart(2,'0')));
 expect(topics.some(t=>t.id==='toan-1-dem-va-so-sanh')).toBe(false);
});

it('old topics with published questions remain usable and unpublished official lessons remain visible',async()=>{
 const [old]=await query("SELECT t.id,t.grade,t.subject_id,COUNT(DISTINCT q.id) n FROM topics t JOIN curriculum_lessons l ON l.topic_id=t.id JOIN curriculum_chapters c ON c.id=l.chapter_id AND c.is_legacy=1 JOIN questions q ON q.topic_id=t.id AND q.status='published' GROUP BY t.id,t.grade,t.subject_id LIMIT 1");
 expect(old).toBeTruthy();const topics=await listTopics(old.subject_id,Number(old.grade));expect(topics.find(t=>t.id===old.id).questionCount).toBe(Number(old.n));
 const grade1=await listTopics('toan',1);expect(grade1.find(t=>t.id==='kntt-toan-1-b02')).toBeTruthy();
});
