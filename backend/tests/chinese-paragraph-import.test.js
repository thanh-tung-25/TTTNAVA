import {describe,it,expect} from 'vitest';
import {parseChineseText} from '../src/services/chinese-import.js';
import {issues} from '../src/validators/chinese.js';
const sample=`**MÔN: Tiếng Trung**
**LỚP: HSK 1**
**CHỦ ĐỀ: Bài 1 你好 - Từ vựng chính và từ mở rộng**
**Câu 1. Trong bài học, “你” có nghĩa là gì?**
A. mười, số 10
B. bạn, anh, chị (ngôi thứ hai)
C. bài học, tiết học
D. già, lâu năm
Đáp án: B
Lời giải: 你 đọc là nǐ, nghĩa là bạn, anh, chị (ngôi thứ hai).
Độ khó: Dễ
**Câu 2. Chọn Hán tự có phiên âm “nǐ” và nghĩa “bạn, anh, chị (ngôi thứ hai)”.**
A. 老
B. 你
C. 十
D. 课
Đáp án: B
Lời giải: 你 đọc là nǐ, nghĩa là bạn, anh, chị (ngôi thứ hai).
Độ khó: Dễ
**Câu 3. Chọn phiên âm đúng của “你” trong bài học.**
A. nǐ
B. kè
C. lǎo
D. shí
Đáp án: A
Lời giải: 你 đọc là nǐ, nghĩa là bạn, anh, chị (ngôi thứ hai).
Độ khó: Dễ
**Câu 4. Trong bài học, “您” có nghĩa là gì?**
A. nhĩ (thành phần chữ trong 你)
B. ngài, ông, bà, anh, chị (cách gọi kính trọng)
C. cửa
D. năm, số 5
Đáp án: B
Lời giải: 您 đọc là nín, nghĩa là ngài, ông, bà, anh, chị (cách gọi kính trọng).
Độ khó: Dễ`;
describe('Chinese paragraph Word format',()=>{
 it('reads all four supplied examples as complete, unapproved questions',()=>{
  const items=parseChineseText(sample);expect(items).toHaveLength(4);expect(items.every(i=>i.kind==='question')).toBe(true);
  expect(items.map(i=>i.data.accepted[0])).toEqual(['bạn, anh, chị (ngôi thứ hai)','你','nǐ','ngài, ông, bà, anh, chị (cách gọi kính trọng)']);
  expect(items.every(i=>i.data.difficulty==='easy'&&!i.data.approved)).toBe(true);
  expect(issues(items.map(i=>({...i,data:{...i.data,approved:true}})))).toEqual([]);
 });
 it('preserves missing/invalid answers without guessing',()=>{
  const items=parseChineseText('Câu 1. Nghĩa?\nA. Xin chào\nB. Tạm biệt\nĐáp án: Z\nĐộ khó: Dễ');
  expect(items[0].data.accepted).toEqual([]);expect(items[1]).toEqual({kind:'unknown',data:{text:'Đáp án chưa xác định được: Z'}});
  expect(issues(items).some(e=>e.message==='Thiếu đáp án đúng')).toBe(true);
 });
 it('preserves unrecognized material and supports mixed table sections',()=>{
  const items=parseChineseText('Ghi chú cần xem lại\n[TU VUNG]\n你好 | nǐ hǎo | Xin chào\n[CAU HOI]\nCâu 1. Chọn lời chào\nA. 你好\nB. 再见\nĐáp án: A\nLời giải: Xin chào\n[BAI DOC]\n你好！');
  expect(items.map(i=>i.kind)).toEqual(['unknown','vocabulary','question','reading']);
 });
 it('flags genuinely identical questions but not repeated unknown fragments',()=>{
  const items=parseChineseText(sample);expect(issues([items[0],items[0]]).some(e=>e.message==='Nội dung trùng trong bộ')).toBe(true);
  expect(issues(parseChineseText('A.\nA.')).filter(e=>e.message==='Nội dung trùng trong bộ')).toEqual([]);
 });
 it('does not truncate question lists at 200',()=>{
  const raw=Array.from({length:250},(_,n)=>`Câu ${n+1}. Câu hỏi ${n+1}\nA. Đúng\nB. Sai\nĐáp án: A\nĐộ khó: Dễ`).join('\n');
  expect(parseChineseText(raw)).toHaveLength(250);
 });
});
