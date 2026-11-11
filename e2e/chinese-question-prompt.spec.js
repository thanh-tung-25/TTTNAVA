import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {chineseQuestionPrompt} from '../frontend/assets/js/chinese-question-prompt.js';
import {activityTemplate} from '../frontend/assets/js/chinese-activity-templates.js';
import {publicItem} from '../backend/src/repositories/chinese.js';
import {parseChineseText} from '../backend/src/services/chinese-import.js';
import {itemSchema} from '../backend/src/validators/chinese.js';

test('removes only pinyin annotations attached to Hanzi across common formats',()=>{
 for(const [source,target]of [
  ['“请问” (qǐngwèn) có nghĩa là gì?','“请问” có nghĩa là gì?'],
  ['请问（qingwen） có nghĩa là gì?','请问 có nghĩa là gì?'],
  ['“女朋友” (nǚ péngyou) có nghĩa là gì?','“女朋友” có nghĩa là gì?'],
  ['“公安局” (gōng’ānjú) nghĩa là gì?','“公安局” nghĩa là gì?'],
  ['“小刘” (Xiǎo Liú) là ai?','“小刘” là ai?'],
  ['“你好！” (ni3hao3) và 您 (nin2).','“你好！” và 您.'],
  ['“请问” (qi\u030cngwe\u0300n) có nghĩa là gì?','“请问” có nghĩa là gì?']
 ]){expect(chineseQuestionPrompt(source)).toBe(target);expect(chineseQuestionPrompt(target)).toBe(target);}
 for(const prompt of ['Chọn Hán tự có phiên âm “qǐngwèn” và nghĩa “xin hỏi”.','Chọn phiên âm đúng của “请问”.','“您” (cách gọi kính trọng) là gì?','“老师” (HSK 1) có nghĩa là gì?','书 (book) có nghĩa là gì?','Chọn “请问” (xin hỏi).'])expect(chineseQuestionPrompt(prompt)).toBe(prompt);
});

test('student serialization, both Word formats and saving remove old pronunciation hints without changing answers',()=>{
 const prompt='Trong bài học, “请问” (qǐngwèn) có nghĩa là gì?',clean='Trong bài học, “请问” có nghĩa là gì?';
 const data={type:'choice',prompt,options:['xin hỏi','sách'],accepted:['xin hỏi'],explanation:'请问 đọc là qǐngwèn.',approved:true};
 const item={kind:'question',data},shown=publicItem(item);
 expect(shown.data.prompt).toBe(clean);expect(shown.data.options).toEqual(data.options);expect(shown.data).not.toHaveProperty('accepted');expect(shown.data).not.toHaveProperty('explanation');expect(item.data.prompt).toBe(prompt);
 const saved=itemSchema.parse(item);expect(saved.data.prompt).toBe(clean);expect(saved.data.accepted).toEqual(data.accepted);expect(saved.data.explanation).toBe(data.explanation);
 for(const text of [`Câu 1. ${prompt}\nA. xin hỏi\nB. sách\nĐáp án: A\nLời giải: ${data.explanation}`,`[CAU HOI]\nchoice | ${prompt} | xin hỏi;;sách | xin hỏi | ${data.explanation}`]){
  const [parsed]=parseChineseText(text);expect(parsed.data.prompt).toBe(clean);expect(parsed.data.accepted).toEqual(data.accepted);expect(parsed.data.explanation).toBe(data.explanation);
 }
 const word={kind:'vocabulary',data:{hanzi:'请问',pinyin:'qǐngwèn',meaning:'xin hỏi'}};expect(publicItem(word)).toEqual(word);expect(itemSchema.parse(word)).toEqual(word);
});

test('omits redundant hint data while preserving the required context and words for each exercise',()=>{
 const context='我___名片。 (Tôi không có danh thiếp.)';expect(chineseQuestionPrompt(context)).toBe(context);
 expect(chineseQuestionPrompt('我___名片。\nTừ/cụm từ gợi ý: 没有 · 有')).toBe('我___名片。');
 expect(chineseQuestionPrompt('Sắp xếp các từ thành câu.\nTừ/cụm từ gợi ý: 我 · 好 · 很')).toBe('Sắp xếp các từ thành câu.\nCác mục trong bài: 我 · 好 · 很');
 for(const title of ['你好','你叫什么名字','很高兴认识你','你去哪儿','你要吃什么','你在哪儿工作']){
  const pack=activityTemplate({level_id:1,title});expect(pack.tasks).toHaveLength(40);
  for(const task of pack.tasks)expect(task.hint).toBeUndefined();
 }
});

test('all 359 vocabulary meaning questions in lessons 3–6 omit the extra pinyin',async()=>{
 let reviewed=0;
 for(const lesson of [3,4,5,6]){
  const pack=JSON.parse(await readFile(`tai-lieu/tieng-trung-bai-3-6/du-lieu-bai-${lesson}.json`,'utf8'));
  for(const [index,word]of pack.vocabulary.entries()){
   const [meaning,hanzi,pinyin]=pack.questions.slice(index*3,index*3+3);
   expect(meaning.prompt).toBe(`Trong bài học, “${word.hanzi}” có nghĩa là gì?`);
   expect(hanzi.prompt).toContain(`“${word.pinyin}”`);expect(pinyin.options).toContain(word.pinyin);expect(meaning.explanation).toContain(word.pinyin);reviewed++;
  }
 }
 expect(reviewed).toBe(359);
});
