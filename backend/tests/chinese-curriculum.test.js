import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {planCurriculum,validateCurriculumChinese} from '../src/services/chinese-curriculum.js';
import {buildCurriculumWord} from '../src/services/chinese-curriculum-word.js';
import {q1QuizVocabulary} from '../src/data/chinese-q1-quiz-vocabulary.js';
import {issues} from '../src/validators/chinese.js';
import {validateActivities} from '../src/services/chinese-activities.js';
import {streetSettingsSchema} from '../src/services/chinese-street.js';
import {quizVersions} from '../src/services/chinese-quiz-state.js';
import {boundChatSettings,boundedClosing,boundedFallback,restrictChatReply} from '../src/services/chinese-curriculum-scope.js';
import {segmentLearnedChinese} from '../src/services/chinese-quiz-language.js';
import {curriculumTemplates} from '../../frontend/assets/js/chinese-curriculum-templates.js';
import {defaultStreetLesson} from '../src/data/chinese-street-missions.js';

it('synchronizes all ten curriculum sections to the complete source and rejects future words',()=>{
 for(const source of q1QuizVocabulary){
  const p=planCurriculum({number:source.number,setId:randomUUID(),items:[]});expect(issues(p.items)).toEqual([]);
  expect(p.items.filter(i=>i.kind==='vocabulary').map(i=>[i.data.hanzi,i.data.pinyin,i.data.meaning])).toEqual(source.words.map(w=>[w.hanzi,w.pinyin,w.meaning]));
  expect(p.items.filter(i=>i.data.practice==='speaking')).toHaveLength(10);expect(p.items.filter(i=>i.data.speaking_selected)).toHaveLength(3);
  expect(p.items.filter(i=>i.kind==='reading')).toHaveLength(2);expect(p.activities.tasks).toHaveLength(40);expect(new Set(p.activities.tasks.map(t=>t.type))).toEqual(new Set(['order','fill','fix','dialogue']));
  expect(()=>validateActivities({...p.activities,status:'published',revision:0})).not.toThrow();expect(()=>streetSettingsSchema.parse({...p.street,revision:0})).not.toThrow();
  expect(()=>validateCurriculumChinese([p.items.filter(i=>i.kind!=='vocabulary').map(i=>i.data),p.activities,p.chat,p.street],source.number)).not.toThrow();
  const template=curriculumTemplates.find(t=>t.number===source.number);
  expect(template.activities).toEqual(p.activities);expect(template.chat).toEqual(p.chat);
  expect(defaultStreetLesson({level_id:1,position:source.number})).toEqual(p.street);
 }
 expect(()=>validateCurriculumChinese({speech:'我吃米饭。'},1)).toThrow('chưa học');
});
it('round-trips Word vocabulary groups, every quiz answer and all speaking questions for ten lessons',async()=>{
 for(const source of q1QuizVocabulary){
  const p=planCurriculum({number:source.number,setId:randomUUID(),items:[]}),word=await buildCurriculumWord(p);
  expect(word.items.filter(i=>i.kind==='unknown')).toHaveLength(0);
  const vocabulary=word.items.filter(i=>i.kind==='vocabulary');expect(vocabulary.map(i=>[i.data.hanzi,i.data.pinyin,i.data.meaning,i.data.group])).toEqual(p.words.map(w=>[w.hanzi,w.pinyin,w.meaning,w.group==='main'?'main':'extended']));
  const questions=word.items.filter(i=>i.kind==='question');expect(questions.map(i=>[i.data.prompt,i.data.options,i.data.accepted])).toEqual(p.items.filter(i=>i.kind==='question').map(i=>[i.data.prompt,i.data.options,i.data.accepted]));
  const spoken=word.items.filter(i=>i.data.practice==='speaking');expect(spoken.map(i=>[i.data.text,i.data.meaning,i.data.answer_reference])).toEqual(p.items.filter(i=>i.data.practice==='speaking').map(i=>[i.data.text,i.data.meaning,i.data.answer_reference]));
  if(source.number===1)expect((await buildCurriculumWord(p)).buffer.equals(word.buffer)).toBe(true);
 }
},30000);
it('keeps content IDs, selected speaking questions and quiz versions stable on repeated synchronization',()=>{
 const setId=randomUUID(),first=planCurriculum({number:3,setId,items:[]});
 first.items.filter(i=>i.data.practice==='speaking').forEach((q,n)=>q.data.speaking_selected=n===5);
 const again=planCurriculum({number:3,setId,items:first.items,speakingSettings:{duration_seconds:60,order:'free',ai_assessment:false}});
 expect(again.items).toEqual(first.items);expect(again.speakingSettings).toEqual({duration_seconds:60,order:'free',ai_assessment:false});
 expect([...quizVersions(again.items.filter(i=>i.kind==='question'))]).toEqual([...quizVersions(first.items.filter(i=>i.kind==='question'))]);
});
it('bounds AI openings, normal replies, translations, fallback and closing messages',()=>{
 for(let n=1;n<=10;n++){
  const settings=boundChatSettings({level_id:1,position:n},{opening:'火星机器人。',translation:'Ngoài bài'});
  expect(settings.allowed_words).toContain('你');expect(()=>segmentLearnedChinese(settings.opening,n)).not.toThrow();
  const bad={reply_zh:'火星机器人。',translation_vi:'Ngoài bài'},reply=restrictChatReply(bad,settings);expect(reply.reply_zh).not.toBe(bad.reply_zh);expect(()=>segmentLearnedChinese(reply.reply_zh,n)).not.toThrow();
  expect(()=>segmentLearnedChinese(boundedFallback(settings).reply_zh,n)).not.toThrow();expect(()=>segmentLearnedChinese(boundedClosing(settings).reply_zh,n)).not.toThrow();
  expect(restrictChatReply({reply_zh:'你好！',translation_vi:'Từ mới 火星'},settings)).not.toHaveProperty('translation_vi','Từ mới 火星');
 }
 const good={reply_zh:'你好！',translation_vi:'Xin chào!'};expect(restrictChatReply(good,boundChatSettings({level_id:1,position:1},good))).toEqual(good);
 expect(boundChatSettings({level_id:1,position:1001},good)).toEqual(good);
});
